import type { Libp2p } from "@libp2p/interface-libp2p";
import type { PeerId } from "@libp2p/interface-peer-id";
import type { Startable } from "@libp2p/interfaces/startable";
export type MessageHandlerComponents = Pick<Libp2p, "getConnections" | "handle" | "unhandle">;
export interface MessageHandlerOpts {
    protocol: string;
}
export type Handler = (message: Uint8Array, peer: PeerId) => void;
export declare class MessageHandler implements Startable {
    private readonly components;
    private readonly options;
    private readonly writers;
    private readonly handlers;
    private started;
    constructor(components: MessageHandlerComponents, options?: Partial<MessageHandlerOpts>);
    start(): Promise<void>;
    stop(): Promise<void>;
    isStarted(): boolean;
    send(message: Uint8Array, peerId: PeerId): Promise<void>;
    handle(handler: Handler): void;
    unhandle(handler: Handler): void;
    private establishStream;
    private handleStream;
}
export declare const createMessageHandler: (options?: Partial<MessageHandlerOpts>) => (components: MessageHandlerComponents) => MessageHandler;
