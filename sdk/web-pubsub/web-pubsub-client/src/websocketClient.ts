import WebSocket, { MessageEvent } from "ws";
import { DownstreamMessageType, UpstreamMessageType } from "./models/messages";
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
    var convertedData : Buffer | ArrayBuffer | string;
    if (Array.isArray(data)) {
      convertedData = Buffer.concat(data);
    } else {
      convertedData = data;
    }

    var message = this._protocol.parseMessages(convertedData);
    switch (message.type) {
      case DownstreamMessageType.Ack: {
        break;
      }
      case DownstreamMessageType.Connected: {
        break;
      }
      case DownstreamMessageType.Disconnected: {
        break;
      }
      case DownstreamMessageType.GroupData: {
        break;
      }
      case DownstreamMessageType.ServerData: {
        
      }
    }

  }

  send(data: string) {
    this._socket.send(data);
  }
}