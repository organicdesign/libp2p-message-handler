# libp2p-message-handler

A message handler for Libp2p. This package makes it easy to create a protocol on Libp2p by converting the streams into a discrete messaging system.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
  - [createMessageHandler](#createmessagehandler)
  - [MessageHandler](#messagehandler)
    - [start](#start)
    - [stop](#stop)
    - [isStarted](#isStarted)
    - [send](#send)
    - [handle](#handle)
    - [unhandle](#unhandle)
- [Logging](#logging)
- [Tests](#tests)
- [TODO](#todo)

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

### createMessageHandler

```javascript
createMessageHandler([options])(libp2p);
```

- `options` `<Object>` An optional object with the following properties:
  - `protocol` `<String>` A string which specifies the name of the protocol. Default: `"/message-handler/0.0.1"`.
- `libp2p` `<Libp2p>` The libp2p instance.
- Returns: `<MessageHandler>` The message handler instance.

Creates a Libp2p message handler.

### MessageHandler

```javascript
new MessageHandler(libp2p, [options]);
```

- `options` `<Object>` An optional object with the following properties:
  - `protocol` `<String>` A string which specifies the name of the protocol. Default: `"/message-handler/0.0.1"`.
- `libp2p` `<Libp2p>` The libp2p instance.

The MessageHandler class. It is not recommended to instanciate it directly but rather use the `createMessageHandler` function.


#### start

```javascript
messageHandler.start();
```

- Returns: `<Promise>`

Start the message handler, resolves when it has finished starting.

#### stop

```javascript
messageHandler.stop();
```

- Returns: `<Promise>`

Stop the message handler, resolves when it has finished stopping.

#### isStarted

```javascript
messageHandler.isStarted();
```

- Returns: `<boolean>`

Check if the message handler is started.

#### send

```javascript
messageHandler.send(message, peer);
```
- `message` `<Uint8Array>` The message to send.
- `peer` `<PeerId>` The peer ID of the peer to send the message to.
- Returns: `<Promise>`

Send a message to a connected peer. Resolves when the message is sent. Rejects if it fails to send the message.

#### handle

```javascript
messageHandler.handle(handlerFunc);
```

- `handlerFunc` `<(Uint8Array, PeerId) => void>` The handler function to call with the received message and the sender's peer ID.

Handle incomming messages from other peers.

#### unhandle

```javascript
messageHandler.unhandle(handlerFunc);
```

- `handlerFunc` `<(Uint8Array, PeerId) => void>` The handler function which was previously handled.

Stop handling messages with this handler function.

## Logging

The logger has the following namespaces:

* `libp2p:message-handler` - Logs general actions like starting, stopping and opening streams.
* `libp2p:message-handler:messages` - Logs when it sends or receives messages.

To enable logging in nodejs add the following environment variable (by prefixing the start command):

```
DEBUG=libp2p:message-handler*
```

Or in the browser:

```javascript
localStorage.setItem("debug", "libp2p:message-handler*");
```

## Tests

To run the test suite:

```
npm run test
```

## TODO

- [x] Add tests.
- [x] Add logging.
