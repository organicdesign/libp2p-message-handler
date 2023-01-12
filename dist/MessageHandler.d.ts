import type { ConnectionManager } from "@libp2p/interface-connection-manager";
import type { Registrar } from "@libp2p/interface-registrar";
import type { PeerId } from "@libp2p/interface-peer-id";
export interface MessageHandlerComponents {
    connectionManager: ConnectionManager;
    registrar: Registrar;
}
export interface MessageHandlerOpts {
    protocol: string;
}
export type Handler = (message: Uint8Array, peer: PeerId) => void;
export declare class MessageHandler {
    private readonly components;
    private readonly options;
    private readonly writers;
    private readonly handlers;
    constructor(components: MessageHandlerComponents, options?: Partial<MessageHandlerOpts>);
    start(): Promise<void>;
    stop(): Promise<void>;
    send(message: Uint8Array, peer: PeerId): Promise<void>;
    handle(handler: Handler): void;
    unhandle(handler: Handler): void;
    private establishStream;
    private handleStream;
}
export declare const createMessageHandler: (options?: Partial<MessageHandlerOpts>) => (components: MessageHandlerComponents) => MessageHandler;
