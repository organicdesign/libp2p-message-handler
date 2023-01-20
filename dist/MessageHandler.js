var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
import * as lp from "it-length-prefixed";
import { pipe } from "it-pipe";
import { pushable } from "it-pushable";
import { logger } from "@libp2p/logger";
const log = {
    message: logger("libp2p:message-handler:messages"),
    general: logger("libp2p:message-handler")
};
export class MessageHandler {
    constructor(components, options = {}) {
        var _a;
        this.writers = new Map();
        this.handlers = new Set();
        this.started = false;
        this.components = components;
        this.options = {
            protocol: (_a = options.protocol) !== null && _a !== void 0 ? _a : "/message-handler/0.0.1"
        };
    }
    // Start the message handler.
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isStarted()) {
                return;
            }
            yield this.components.handle(this.options.protocol, ({ stream, connection }) => __awaiter(this, void 0, void 0, function* () {
                this.handleStream(stream, connection);
            }));
            this.started = true;
            log.general("started");
        });
    }
    // Stop the message handler.
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isStarted()) {
                return;
            }
            yield this.components.unhandle(this.options.protocol);
            this.handlers.clear();
            this.started = false;
            log.general("stopped");
        });
    }
    isStarted() {
        return this.started;
    }
    // Send a message to a connected peer.
    send(message, peerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const writer = yield this.establishStream(peerId);
            writer.push(message);
            log.message("sent message to: peer %p", peerId);
        });
    }
    broadcast(message) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Promise.allSettled(this.components.getConnections().map(c => this.send(message, c.remotePeer)));
        });
    }
    // Handle an incomming message.
    handle(handler) {
        this.handlers.add(handler);
        log.general("added message handler");
    }
    // Stop handling incomming messages with the handler.
    unhandle(handler) {
        this.handlers.delete(handler);
        log.general("removed message handler");
    }
    // Establish a stream to a peer reusing an existing one if it already exists.
    establishStream(peer) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = this.components.getConnections().find(c => c.remotePeer.equals(peer));
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
                const stream = yield connection.newStream(this.options.protocol);
                return this.handleStream(stream, connection);
            }
            catch (error) {
                log.general.error("failed to open new stream: %o", error);
                throw error;
            }
        });
    }
    handleStream(stream, connection) {
        const handlers = this.handlers;
        const peerId = connection.remotePeer;
        // Handle inputs.
        pipe(stream, lp.decode(), function (source) {
            var _a, source_1, source_1_1;
            var _b, e_1, _c, _d;
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    for (_a = true, source_1 = __asyncValues(source); source_1_1 = yield source_1.next(), _b = source_1_1.done, !_b;) {
                        _d = source_1_1.value;
                        _a = false;
                        try {
                            const message = _d;
                            for (const handler of handlers) {
                                log.message("received message from peer: %p", connection.remotePeer);
                                handler(message.subarray(), connection.remotePeer);
                            }
                        }
                        finally {
                            _a = true;
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (!_a && !_b && (_c = source_1.return)) yield _c.call(source_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            });
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
        (() => __awaiter(this, void 0, void 0, function* () {
            try {
                yield pipe(writer, lp.encode(), stream);
            }
            finally {
                log.general("stream ended to peer: %p", peerId);
                this.writers.delete(peerId.toString());
            }
        }))();
        return writer;
    }
}
export const createMessageHandler = (options) => (components) => new MessageHandler(components, options);
