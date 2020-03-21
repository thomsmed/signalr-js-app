# SignalR JS Client demo app

## Host with Ruby
Run
``` shell
npm run start-ruby
```
Or
``` shell
ruby -run -e httpd . -p 8008
```

## Host with Node.js
Run
``` shell
npm run start-node
```
Or
``` shell
npx http-server . -p 8008
```

## Sites

### Using SignalR Javascript Client Library

Simple demo using the SignalR JS client provided by .net core

### Using WebSockets directly

Simple demo using custom SignalR JS client

Communication must comfirm to the [SignalR Protocol Specs](https://github.com/aspnet/SignalR/tree/master/specs).

#### Highlights form the protocol
- Messages sendt as JSON must be terminated by the ASCII character 0x1E (record separator)
- After WebSocket connection is made, a handshake request is made in the form of: `{ protocol: "json", version: 1 }`. The version number is always `1`
- After handshake, invocation (messages wiht `type = 1`) messages can be sent in the form of: `{ type: 1, invocationId: "<arbitrary-string>", target: "MethodToCall", arguments: [1, "someString", ["arg0", 2]] }`. The `invocationId` is optional.