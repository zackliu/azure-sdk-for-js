import WebSocket, { MessageEvent } from "ws";
import { WebPubSubClientProtocol } from "./protocols";

class WebSocketClient {
  private readonly _socket: WebSocket;
  private readonly _protocol: WebPubSubClientProtocol;

  constructor(uri: string, protocol: WebPubSubClientProtocol) {
    this._protocol = protocol;
    this._socket = new WebSocket(uri, protocol.name);
    this._socket.onopen = e => {
      console.log("connection is opened");
    }
    this._socket.onmessage = this.onmessage;
    this._socket.binaryType = "arraybuffer";
  }

  onmessage(event: MessageEvent) {
    var data = event.data;
    if (data instanceof string)
    var message = this._protocol.parseMessages(event.data)
  }

  send(data: string) {
    this._socket.send(data);
  }
}