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

`options` is an optional object with the following properties:
- `protocol`: A string which specifies the name of the protocol. Defaults to `"/message-handler/0.0.1"`.
