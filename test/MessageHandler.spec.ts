import { createRSAPeerId } from "@libp2p/peer-id-factory";
import { mockRegistrar, mockConnectionManager, mockNetwork } from "@libp2p/interface-mocks";
import { start } from "@libp2p/interfaces/startable";
import { stubInterface } from "ts-sinon";
import { jest } from "@jest/globals";
import * as lp from "it-length-prefixed";
import { pipe } from "it-pipe";
import type { ConnectionManager } from "@libp2p/interface-connection-manager";
import type { PeerId } from "@libp2p/interface-peer-id";
import type { Stream } from "@libp2p/interface-connection";
import type { Libp2p } from "@libp2p/interface-libp2p";
import { MessageHandlerComponents, createMessageHandler, MessageHandler } from "../src/index.js";

interface TestMessageHandlerComponents extends MessageHandlerComponents {
	peerId: PeerId
	dial: Libp2p["dial"]
}

const createComponents = async (): Promise<TestMessageHandlerComponents> => {
	const oldComponents = {
		peerId: await createRSAPeerId({ bits: 512 }),
		registrar: mockRegistrar(),
		connectionManager: stubInterface<ConnectionManager>() as ConnectionManager
	};

	oldComponents.connectionManager = mockConnectionManager(oldComponents);

	const components: TestMessageHandlerComponents = {
		peerId: oldComponents.peerId,
		dial: (peerId) => oldComponents.connectionManager.openConnection(peerId),
		handle: (protocol: string, handler) => oldComponents.registrar.handle(protocol, handler),
		unhandle: (protocol: string) => oldComponents.registrar.unhandle(protocol),
		getConnections: () => oldComponents.connectionManager.getConnections()
	};

	await start(...Object.entries(components));

	mockNetwork.addNode(oldComponents);

	return components;
};

let messageHandler: MessageHandler, components: TestMessageHandlerComponents;

beforeEach(async () => {
	components = await createComponents();
	messageHandler = createMessageHandler()(components);
});

describe("startable interface", () => {
	it("is not started after creation", async () => {
		expect(messageHandler.isStarted()).toBe(false);
	});

	it("starts", async () => {
		await messageHandler.start();

		expect(messageHandler.isStarted()).toBe(true);
	});

	it("stops", async () => {
		await messageHandler.start();
		await messageHandler.stop();

		expect(messageHandler.isStarted()).toBe(false);
	});
});

describe("message handling", () => {
	beforeEach(async () => {
		await messageHandler.start();
	});

	it("calls the handler function on every message", async () => {
		const messages = [
			new Uint8Array([1]),
			new Uint8Array([123]),
			new Uint8Array([123, 1, 1, 0, 0, 56])
		];

		const fn = jest.fn();

		messageHandler.handle(fn);

		const remote = await createComponents();
		const connection = await remote.dial(components.peerId);
		const stream = await connection.newStream("/message-handler/0.0.1");

		await pipe(messages, lp.encode(), stream);

		// Wait till the next tick to give the handler time to process the messages.
		await new Promise(resolve => setTimeout(resolve, 1));

		expect(fn).toBeCalledTimes(messages.length);

		for (let i = 0; i < messages.length; i++) {
			const args = fn.mock.calls[i];

			expect(args[0]).toStrictEqual(messages[i]);
			expect(remote.peerId.equals(args[1] as PeerId)).toBeTruthy();
		}
	});

	it("stops calling the handler when unhandled", async () => {
		const messages = [
			new Uint8Array([1]),
			new Uint8Array([123]),
			new Uint8Array([123, 1, 1, 0, 0, 56])
		];

		const fn = jest.fn();

		messageHandler.handle(fn);
		messageHandler.unhandle(fn);

		const remote = await createComponents();
		const connection = await remote.dial(components.peerId);
		const stream = await connection.newStream("/message-handler/0.0.1");

		await pipe(messages, lp.encode(), stream);

		// Wait till the next tick to give the handler time to process the messages.
		await new Promise(resolve => setTimeout(resolve, 1));

		expect(fn).not.toBeCalled();
	});
});

describe("message sending", () => {
	beforeEach(async () => {
		await messageHandler.start();
	});

	it("sends messages to peers", async () => {
		const messages = [
			new Uint8Array([1]),
			new Uint8Array([123]),
			new Uint8Array([123, 1, 1, 0, 0, 56])
		];

		const remote = await createComponents();
		await remote.dial(components.peerId);

		// Set up a promise that will resolve to the handled stream.
		let resolver: (stream: Stream) => void;

		const promise: Promise<Stream> = new Promise(resolve => {
			resolver = resolve;
		});

		// Resolve the stream.
		await remote.handle("/message-handler/0.0.1", async ({ stream }) => {
			resolver(stream);
		});

		// Read the stream into responses.
		const responsePromises = (async () => {
			const responses: Uint8Array[] = [];
			const stream = await promise;

			await pipe(stream, lp.decode(), async (itr) => {
				for await (const response of itr) {
					responses.push(response.subarray());

					if (responses.length === messages.length) {
						return;
					}
				}
			});

			return responses;
		})();

		// Send all the messages.
		for (const message of messages) {
			await messageHandler.send(message, remote.peerId);
		}

		// Await the responses.
		const responses = await responsePromises;

		// Check the responses are the same as what was sent.
		expect(responses).toStrictEqual(messages);
	});
});
