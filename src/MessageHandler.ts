import type { ConnectionManager } from "@libp2p/interface-connection-manager";
import type { Connection, Stream } from "@libp2p/interface-connection";
import type { Registrar } from "@libp2p/interface-registrar";
import type { PeerId } from "@libp2p/interface-peer-id";
import type { Startable } from "@libp2p/interfaces/startable";
import * as lp from "it-length-prefixed";
import { pipe } from "it-pipe";
import { pushable, Pushable } from "it-pushable";
import { logger } from "@libp2p/logger";

const log = {
	message: logger("libp2p:message-handler:messages"),
	general: logger("libp2p:message-handler")
};

export interface MessageHandlerComponents {
	connectionManager: ConnectionManager
	registrar: Registrar
}

export interface MessageHandlerOpts {
	protocol: string
}

export type Handler = (message: Uint8Array, peer: PeerId) => void;

export class MessageHandler implements Startable {
	private readonly components: MessageHandlerComponents;
	private readonly options: MessageHandlerOpts;
	private readonly writers = new Map<string, Pushable<Uint8Array>>();
	private readonly handlers = new Set<Handler>();
	private started = false;

	constructor (components: MessageHandlerComponents, options: Partial<MessageHandlerOpts> = {}) {
		this.components = components;

		this.options = {
			protocol: options.protocol ?? "/message-handler/0.0.1"
		};
	}

	// Start the message handler.
	async start (): Promise<void> {
		await this.components.registrar.handle(this.options.protocol, async ({ stream, connection }) => {
			this.handleStream(stream, connection);
		});

		this.started = true;

		log.general("started");
	}

	// Stop the message handler.
	async stop (): Promise<void> {
		await this.components.registrar.unhandle(this.options.protocol);
		this.handlers.clear();

		this.started = false;

		log.general("stopped");
	}

	isStarted (): boolean {
		return this.started;
	}

	// Send a message to a connected peer.
	async send (message: Uint8Array, peerId: PeerId): Promise<void> {
		const writer = await this.establishStream(peerId);

		writer.push(message);

		log.message("sent message to: peer %p", peerId);
	}

	// Handle an incomming message.
	handle (handler: Handler): void {
		this.handlers.add(handler);

		log.general("added message handler");
	}

	// Stop handling incomming messages with the handler.
	unhandle (handler: Handler): void {
		this.handlers.delete(handler);

		log.general("removed message handler");
	}

	// Establish a stream to a peer reusing an existing one if it already exists.
	private async establishStream (peer: PeerId) {
		const connection = this.components.connectionManager.getConnections().find(c => c.remotePeer.equals(peer));

		if (connection == null) {
			log.general.error("failed to open stream: peer is not connected");
			throw new Error("not connected");
		}

		const writer = this.writers.get(peer.toString());

		if (writer != null) {
			// We already have a stream open.
			return writer;
		}

		log.general("opening new stream");

		try {
			const stream = await connection.newStream(this.options.protocol);

			return this.handleStream(stream, connection);
		} catch (error) {
			log.general.error("failed to open new stream: %o", error);

			throw error;
		}
	}

	private handleStream (stream: Stream, connection: Connection) {
		const handlers = this.handlers;
		const peerId = connection.remotePeer;

		// Handle inputs.
		pipe(stream, lp.decode(), async function (source) {
			for await (const message of source) {
				for (const handler of handlers) {
					log.message("received message from peer: %p", connection.remotePeer);
					handler(message.subarray(), connection.remotePeer);
				}
			}
		}).catch(error => {
			// Do nothing
			log.general.error("failed to handle incoming stream: %o", error);
		});

		// Don't create a writer if one already exists.
		const eWriter = this.writers.get(peerId.toString());

		if (eWriter != null) {
			return eWriter;
		}

		const writer = pushable();

		this.writers.set(peerId.toString(), writer);

		// Handle outputs.
		(async () => {
			try {
				await pipe(writer, lp.encode(), stream);
			} finally {
				log.general("stream ended to peer: %p", peerId);
				this.writers.delete(peerId.toString());
			}
		})();

		return writer;
	}
}

export const createMessageHandler = (options?: Partial<MessageHandlerOpts>) => (components: MessageHandlerComponents) => new MessageHandler(components, options);
