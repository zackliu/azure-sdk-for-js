// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AbortController, AbortSignal, AbortSignalLike } from "@azure/abort-controller";
import { resolve } from "dns";
import { CloseEvent, MessageEvent, WebSocket } from "ws";
import { ReconnectionOptions, SendToGroupOptions, SendToServerOptions, WebPubSubClientOptions } from "./models";
import { ConnectedMessage, DataMessage, DisconnectedMessage, DownstreamMessageType, GroupDataMessage, ServerDataMessage, WebPubSubDataType, WebPubSubMessage, JoinGroupMessage, UpstreamMessageType, LeaveGroupMessage, SendToGroupMessage } from "./models/messages";
import { WebPubSubClientProtocol } from "./protocols";
import { WebPubSubJsonProtocol } from "./protocols/webPubSubJsonProtocol";
import { DefaultWebPubSubClientCredential, WebPubSubClientCredential } from "./webPubSubClientCredential";

export type OnMessage = (data: DataMessage) => Promise<void>;

export type OnConnected = (data: ConnectedMessage) => Promise<void>;

export type OnDisconnected = (data: DisconnectedMessage) => Promise<void>;

export type OnGroupMessageReceived = (data: GroupDataMessage) => Promise<void>;

export class WebPubSubClient {
  private readonly _protocol: WebPubSubClientProtocol;
  private readonly _credential: WebPubSubClientCredential;
  private readonly _options: WebPubSubClientOptions;
  private readonly _groupMap: Map<string, WebPubSubGroup>;

  private _socket?: WebSocket;
  private _uri?: string;
  private _lastCloseEvent?: CloseEvent;
  private _lastDisconnectedMessage?: DisconnectedMessage
  private _connectionId?: string;
  private _reconnectionToken?: string;
  private _isInitialConnected = false;
  private _ackId: bigint;

  private nextAckId() {
    this._ackId = this._ackId + BigInt(1);
    return this._ackId;
  }

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
    this._groupMap = new Map<string, WebPubSubGroup>();

    this._state = WebPubSubClientState.Disconnected;
    this._ackId = BigInt(0);
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

    let uri = await this._credential.getClientAccessUri(abortSignal);
    await this.connectCore(uri);
  }

  public async stop(abortSignal?: AbortSignalLike) : Promise<void> {

  }

  public async sendToServer(eventName: string,
     content: string | ArrayBuffer,
     dataType: WebPubSubDataType,
     ackId?: bigint,
     abortSignal?: AbortSignalLike): Promise<void> {

  }

  public async joinGroup(groupName: string, ackId?: bigint, abortSignal?: AbortSignalLike): Promise<void> {
    let group = this.getOrAddGroup(groupName);
    group.isJoined = true;

    return await this.sendMessageWithAckId(id => {
      return {
        group: groupName,
        ackId: id,
        type: UpstreamMessageType.JoinGroup
      } as JoinGroupMessage;
    }, ackId, abortSignal);
  }

  public async leaveGroup(groupName: string, ackId?: bigint, abortSignal?: AbortSignalLike): Promise<void> {
    let group = this.getOrAddGroup(groupName);
    group.isJoined = false;

    return await this.sendMessageWithAckId(id => {
      return {
        group: groupName,
        ackId: ackId,
        type: UpstreamMessageType.LeaveGroup
      } as LeaveGroupMessage;
    }, ackId, abortSignal);
  }

  public async sendToGroup(groupName: string, content: string | ArrayBuffer,
    dataType: WebPubSubDataType,
    ackId?: bigint,
    options?: SendToGroupOptions,
    abortSignal?: AbortSignalLike): Promise<void> {
      let group = this.getOrAddGroup(groupName);

      if (options == null) {
        options = {fireAndForget: false, noEcho: false};
      }

      let noEcho = options.noEcho;

      if (!options.fireAndForget) {
        return await this.sendMessageWithAckId(id => {
          return {
            type: UpstreamMessageType.SendToGroup,
            group: groupName,
            dataType: dataType,
            data: content,
            ackId: id,
            noEcho: noEcho,
          } as SendToGroupMessage;
        }, ackId, abortSignal); 
      };

      const message =  {
        type: UpstreamMessageType.SendToGroup,
        group: groupName,
        dataType: dataType,
        data: content,
        noEcho: noEcho,
      } as SendToGroupMessage

      return await this.sendMessage(message, abortSignal);
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
    let data = event.data;
    let convertedData : Buffer | ArrayBuffer | string;
    if (Array.isArray(data)) {
      convertedData = Buffer.concat(data);
    } else {
      convertedData = data;
    }

    let message = this._protocol.parseMessages(convertedData);
    switch (message.type) {
      case DownstreamMessageType.Ack: {
        break;
      }
      case DownstreamMessageType.Connected: {
        this.handleConnected(message as ConnectedMessage)
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

  private handleConnected(message: ConnectedMessage): void {
    this._connectionId = message.connectionId;
    this._reconnectionToken = message.reconnectionToken;

    if (!this._isInitialConnected) {
      this._isInitialConnected = true;
      if (this._onConnected != null) {
        this._onConnected(message);
      }
    }
  }

  private handleDisconnected(message: DisconnectedMessage): void {
    this._lastDisconnectedMessage = message;
  }

  private handleGroupData(message: GroupDataMessage): void {
    
  }

  private handleServerData(message: ServerDataMessage): void {

  }

  private raiseClose(event: CloseEvent) {

  }

  private sendMessage(message: WebPubSubMessage, abortSignal?: AbortSignalLike): Promise<void> {
    let payload = this._protocol.writeMessage(message);

    return new Promise((resolve, reject) => {
      this._socket.send(payload, err => {
        if (err) {
          reject(err)
        } else {
          resolve();
        }
      });
    });
  }

  private sendMessageWithAckId(messageProvider: (ackId: bigint) => WebPubSubMessage, ackId?: bigint, abortSignal?: AbortSignalLike): Promise<void> {
    if (ackId == null) {
      ackId = this.nextAckId();
    }

    const message = messageProvider(ackId);
    return this.sendMessage(message, abortSignal);
  }

  private async tryRecovery(): Promise<void> {
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
    let recoveryUri = this.buildRecoveryUri();
    if (!recoveryUri) {
      console.warn("Connection id or reonnection token is not availble");
      this.raiseClose(this._lastCloseEvent);
      return;
    }

    let abortSignal = AbortController.timeout(30 * 1000);
    let timeout = delay(30 * 1000).then(() => abortSignal.onabort) // 30s
    while (timeout) {
      try {
        await this.connectCore(recoveryUri);
        return;
      } catch {
        await delay(1000);
      }
    }

  }

  private buildDefaultOptions(): WebPubSubClientOptions {
    return <WebPubSubClientOptions> {
      protocol: new WebPubSubJsonProtocol(),
      reconnectionOptions: <ReconnectionOptions> {
        autoReconnect: true,
        autoRejoinGroups: true,
      }
    }
  }

  private buildRecoveryUri(): string|null {
    if (this._connectionId && this._reconnectionToken && this._uri) {
      let url = new URL(this._uri);
      url.searchParams.append('awps_connection_id', this._connectionId);
      url.searchParams.append('awps_reconnection_token', this._reconnectionToken);
      return url.toString();
    }
    return null;
  }

  getOrAddGroup(name: string): WebPubSubGroup {
    if (!this._groupMap.has(name)) {
      this._groupMap.set(name, new WebPubSubGroup(name));
    }
    return this._groupMap.get(name) as WebPubSubGroup; 
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

class WebPubSubGroup {
  public readonly name: string;
  public isJoined = false;
  public callback?: OnGroupMessageReceived;

  constructor(name: string) {
    this.name = name;
  }
}