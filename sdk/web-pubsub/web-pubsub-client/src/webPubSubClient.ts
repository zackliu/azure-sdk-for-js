// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AbortSignalLike } from "@azure/abort-controller";
import { resolve } from "dns";
import { CloseEvent, MessageEvent, WebSocket } from "ws";
import { ReconnectionOptions, WebPubSubClientOptions } from "./models";
import { ConnectedMessage, DataMessage, DisconnectedMessage, DownstreamMessageType, WebPubSubDataType } from "./models/messages";
import { WebPubSubClientProtocol } from "./protocols";
import { WebPubSubJsonProtocol } from "./protocols/webPubSubJsonProtocol";
import { DefaultWebPubSubClientCredential, WebPubSubClientCredential } from "./webPubSubClientCredential";
import { WebPubSubGroup } from "./webPubSubGroup";

export type OnMessage = (data: DataMessage) => Promise<void>;

export type OnConnected = (data: ConnectedMessage) => Promise<void>;

export type OnDisconnected = (data: DisconnectedMessage) => Promise<void>;

export class WebPubSubClient {
  private readonly _protocol: WebPubSubClientProtocol;
  private readonly _credential: WebPubSubClientCredential;
  private readonly _options: WebPubSubClientOptions;

  private _socket: WebSocket;
  private _uri: string;
  private _lastCloseEvent: CloseEvent;
  private _connectionId?: string;
  private _reconnectionToken?: string;

  private _isStopped = false;
  private _state: WebPubSubClientState;

  private _onMessage?: OnMessage;
  private _onConnected?: OnConnected;
  private _onDisconnected?: OnDisconnected;

  constructor(clientAccessUri: string, options?: WebPubSubClientOptions);
  constructor(credential: WebPubSubClientCredential, options?: WebPubSubClientOptions)
  constructor(credential: string | WebPubSubClientCredential, options?: WebPubSubClientOptions) {
    if (typeof credential == "string") {
      this._credential = new DefaultWebPubSubClientCredential(credential);
    } else {
      this._credential = credential;
    }

    if (!options) {
      this._options = this.buildDefaultOptions();
    } else {
      this._options = options;
    }

    this._protocol = this._options.protocol;
  }

  public async connect(abortSignal?: AbortSignalLike) : Promise<void> {
    if (this._isStopped) {
      console.error("Can't start a stopped client");
      return;
    }

    if (this._state != WebPubSubClientState.Disconnected) {
      console.warn("Can't start a client whose state is not Disconnected");
      return;
    }
    this._state = WebPubSubClientState.Connecting;

    console.info("Staring a new connection");

    var uri = await this._credential.getClientAccessUri(abortSignal);
    await this.connectCore(uri, abortSignal);
  }

  public async stop(abortSignal?: AbortSignalLike) : Promise<void> {

  }

  public async sendToServer(eventName: string,
     content: string | ArrayBuffer,
     dataType: WebPubSubDataType,
     ackId?: bigint,
     abortSignal?: AbortSignalLike): Promise<void> {

  }

  public group(groupName: string): WebPubSubGroup{

  }

  private connectCore(uri: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let socket = new WebSocket(uri, this._protocol.name);

      socket = new WebSocket(uri, this._protocol.name);

      socket.onopen = e => {
        console.log("connection is opened");
        this._socket = socket;
        this._state = WebPubSubClientState.Connected;
        resolve();
      }

      socket.onerror = e => {
        reject(e.error);
      }

      socket.onclose = e => {
        if (this._state == WebPubSubClientState.Connected) {
          this._lastCloseEvent = e;
          if (e.code == 1008) {
            console.warn("The websocket close with status code 1008. Stop recovery.");
            this.raiseClose(e);
          } else {
            this.tryRecovery();
          }
        } else {
          reject(e.reason);
        }
      }

      socket.onmessage = this.onmessage;
      socket.binaryType = "arraybuffer";
    });
  }

  private onmessage(event: MessageEvent) {
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

  raiseClose(event: CloseEvent) {

  }

  async tryRecovery(): Promise<void> {
    // Clean ack cache

    if (this._isStopped) {
      console.warn("The client is stopped. Stop recovery.");
      this.raiseClose(this._lastCloseEvent);
      return;
    }

    if (!this._protocol.isReliableSubProtocol) {
      console.warn("The protocol is not reliable, recovery is not applicable");
      this.raiseClose(this._lastCloseEvent);
      return;
    }

    // Build recovery uri
    var recoveryUri = this.buildRecoveryUri();
    if (!recoveryUri) {
      console.warn("Connection id or reonnection token is not availble");
      this.raiseClose(this._lastCloseEvent);
      return;
    }

    


  }

  buildDefaultOptions(): WebPubSubClientOptions {
    return <WebPubSubClientOptions> {
      protocol: new WebPubSubJsonProtocol(),
      reconnectionOptions: <ReconnectionOptions> {
        autoReconnect: true,
        autoRejoinGroups: true,
      }
    }
  }

  buildRecoveryUri(): string|null {
    if (this._connectionId && this._reconnectionToken) {
      var url = new URL(this._uri);
      url.searchParams.append('awps_connection_id', this._connectionId);
      url.searchParams.append('awps_reconnection_token', this._reconnectionToken);
      return url.toString();
    }
    return null;
  }
}

function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time));
}

enum WebPubSubClientState {
  Disconnected = 1,
  Connecting = 2,
  Connected = 3,
  Recovering = 4,
}