# libp2p-message-handler

A message handler for Libp2p. This package makes it easy to create a protocol on Libp2p by converting the streams into a discrete messaging system.

## Install

```
npm i @organicdesign/libp2p-message-handler
```

## Usage

```javascript
import { createMessageHandler } from "@organicdesign/libp2p-message-handler";

const handler = createMessageHandler(options)(libp2p);

await handler.start();

handler.handle((message, peer) => {
	// Handler an incomming message.
});

// Send a message to a peer (will throw if not connected).
await handler.send(message, peer);

// Stop the synchronizer.
await handler.stop();
```

## API

### createMessageHandler([options])(libp2p)

```javascript
createMessageHandler([options])(libp2p);
```

- `options` `<Object>` An optional object with the following properties:
  - `protocol` `<String>` A string which specifies the name of the protocol. Default: `"/message-handler/0.0.1"`.
- `libp2p` `<Libp2p>` The libp2p instance.
- Returns: `<MessageHandler>` The message handler instance.

Creates a Libp2p message handler.

### handler.start()

```javascript
handler.start();
```

- Returns: `<Promise>`

Start the message handler, resolves when it has finished starting.

### handler.stop()

```javascript
handler.stop();
```

- Returns: `<Promise>`

Stop the message handler, resolves when it has finished stopping.

### handler.send(message, peer)

```javascript
handler.send(message, peer);
```
- `message` `<Uint8Array>` The message to send.
- `peer` `<PeerId>` The peer ID of the peer to send the message to.
- Returns: `<Promise>`

Send a message to a connected peer. Resolves when the message is sent. Rejects if it fails to send the message.

### handler.handle(handlerFunc)

```javascript
handler.handle(handlerFunc);
```

- `handlerFunc` `<(Uint8Array, PeerId) => void>` The handler function to call with the received message and the sender's peer ID.

Handle incomming messages from other peers.

### handler.unhandle(handlerFunc)

```javascript
handler.unhandle(handlerFunc);
```

- `handlerFunc` `<(Uint8Array, PeerId) => void>` The handler function which was previously handled.

Stop handling messages with this handler function.

## TODO

- Add tests.
