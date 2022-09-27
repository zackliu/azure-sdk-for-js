// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AbortController, AbortSignalLike } from "@azure/abort-controller";
import { CloseEvent, MessageEvent, WebSocket } from "ws";
import { SendMessageError } from "./errors";
import { AckResult, OnConnectedArgs, OnDisconnectedArgs, OnGroupDataMessageArgs, OnServerDataMessageArgs, ReconnectionOptions, SendToGroupOptions, SendToServerOptions, WebPubSubClientOptions } from "./models";
import { ConnectedMessage, DisconnectedMessage, DownstreamMessageType, GroupDataMessage, ServerDataMessage, WebPubSubDataType, WebPubSubMessage, JoinGroupMessage, UpstreamMessageType, LeaveGroupMessage, SendToGroupMessage, SendEventMessage, AckMessage, SequenceAckMessage} from "./models/messages";
import { WebPubSubClientProtocol } from "./protocols";
import { WebPubSubJsonReliableProtocol } from "./protocols/webPubSubJsonReliableProtocol";
import { DefaultWebPubSubClientCredential, WebPubSubClientCredential } from "./webPubSubClientCredential";

/**
 * Types which can be serialized and sent as JSON.
 */
export type JSONTypes = string | number | boolean | object;

/**
 * Types as callback to be used when received messages from server.
 */
export type OnServerMessage = (args: OnServerDataMessageArgs) => Promise<void>;

/**
 * Types as callback to be used when received messages from groups.
 */
export type OnGroupMessage = (args: OnGroupDataMessageArgs) => Promise<void>;

/**
 * Types as callback to be used when connected
 */
export type OnConnected = (args: OnConnectedArgs) => Promise<void>;

/**
 * Types as callback to be used when disconnected
 */
export type OnDisconnected = (args: OnDisconnectedArgs) => Promise<void>;

/**
 * The WebPubSub client
 */
export class WebPubSubClient {
  private readonly _protocol: WebPubSubClientProtocol;
  private readonly _credential: WebPubSubClientCredential;
  private readonly _options: WebPubSubClientOptions;
  private readonly _groupMap: Map<string, WebPubSubGroup>;
  private readonly _ackMap: Map<number, AckEntity>;
  private readonly _sequenceId: SequenceId;

  // client lifetime

  /**
   * Callback when received messages from server.
   */
  public onServerMessage?: OnServerMessage;

  /**
   * Callback when connected
   */
  public onConnected?: OnConnected;

  /**
   * Callback when disconnected
   */
  public onDisconnected?: OnDisconnected;

  private _onGroupMessage?: OnGroupMessage;

  /**
   * Callback when received messages from group or from specific group
   * @param groupName The group name
   * @param calback The callback
   */
  public onGroupMessage(...args: [
    /**
     * The callback
     */
    calback: OnGroupMessage
  ] | [
    /**
     * The group name
     */
    groupName: string,
    /**
     * The callback
     */
    calback: OnGroupMessage,
  ]): void {
    if (typeof args[0] === 'string') {
      let group = this.getOrAddGroup(args[0]);
      group.callback = args[1];
    } else {
      this._onGroupMessage = args[0] as OnGroupMessage;
    }
  }

  private _state: WebPubSubClientState;
  private _isStopped = false;
  
  // connection lifetime
  private _socket?: WebSocket;
  private _uri?: string;
  private _lastCloseEvent?: CloseEvent;
  private _lastDisconnectedMessage?: DisconnectedMessage
  private _connectionId?: string;
  private _reconnectionToken?: string;
  private _isInitialConnected = false;
  private _ackId: number;
  private _sequenceAckTask?: AbortableTask;

  private nextAckId() {
    this._ackId = this._ackId + 1;
    return this._ackId;
  }

  /**
   * Create an instance of WebPubSubClient
   * @param clientAccessUri The uri to connect
   * @param options The client options
   */
  constructor(clientAccessUri: string, options?: WebPubSubClientOptions);
  /**
   * Create an instance of WebPubSubClient
   * @param credential The credential to use when connecting
   * @param options The client options
   */
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
    this._ackMap = new Map<number, AckEntity>();
    this._sequenceId = new SequenceId();

    this._state = WebPubSubClientState.Disconnected;
    this._ackId = 0;
  }

  /**
   * Start to start to the service.
   * @param abortSignal The abort signal
   */
  public async start(abortSignal?: AbortSignalLike) : Promise<void> {
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

    this._uri = await this._credential.getClientAccessUri(abortSignal);
    await this.connectCore(this._uri);
  }

  /**
   * Stop the client. The stopped client can't use connect() to start again.
   */
  public stop() {
    this._isStopped = true;
    if (this._socket) {
      this._socket.close();
    }
  }

  /**
   * Send custom event to server
   * @param eventName The event name
   * @param content The data content
   * @param dataType The data type
   * @param ackId  The optional ackId. If not specified, client will generate one.
   * @param options The options
   * @param abortSignal The abort signal
   */
  public async sendToServer(eventName: string,
     content: JSONTypes | ArrayBuffer,
     dataType: WebPubSubDataType,
     ackId?: number,
     options?: SendToServerOptions,
     abortSignal?: AbortSignalLike): Promise<void|AckResult> {
      if (options == null) {
        options = {fireAndForget: false};
      }

      if (!options.fireAndForget) {
        return await this.sendMessageWithAckId(id => {
          return {
            _type: UpstreamMessageType.SendEvent,
            dataType: dataType,
            data: content,
            ackId: id,
            event: eventName
          } as SendEventMessage;
        }, ackId, abortSignal); 
      };

      const message =  {
        _type: UpstreamMessageType.SendEvent,
        dataType: dataType,
        data: content,
        event: eventName
      } as SendEventMessage

      return await this.sendMessage(message, abortSignal);
  }

  /**
   * Join the client to group
   * @param groupName The group name
   * @param ackId The optional ackId. If not specified, client will generate one. 
   * @param abortSignal The abort signal
   */
  public async joinGroup(groupName: string, ackId?: number, abortSignal?: AbortSignalLike): Promise<AckResult> {
    let group = this.getOrAddGroup(groupName);
    group.isJoined = true;

    return await this.sendMessageWithAckId(id => {
      return {
        group: groupName,
        ackId: id,
        _type: UpstreamMessageType.JoinGroup
      } as JoinGroupMessage;
    }, ackId, abortSignal);
  }

  /**
   * Leave the client from group
   * @param groupName The group name
   * @param ackId The optional ackId. If not specified, client will generate one. 
   * @param abortSignal The abort signal
   */
  public async leaveGroup(groupName: string, ackId?: number, abortSignal?: AbortSignalLike): Promise<AckResult> {
    let group = this.getOrAddGroup(groupName);
    group.isJoined = false;

    return await this.sendMessageWithAckId(id => {
      return {
        group: groupName,
        ackId: id,
        _type: UpstreamMessageType.LeaveGroup
      } as LeaveGroupMessage;
    }, ackId, abortSignal);
  }

  /**
   * Send message to group.
   * @param groupName The group name
   * @param content The data content
   * @param dataType The data type
   * @param ackId The optional ackId. If not specified, client will generate one. 
   * @param options The options
   * @param abortSignal The abort signal
   */
  public async sendToGroup(groupName: string, content: JSONTypes | ArrayBuffer,
    dataType: WebPubSubDataType,
    ackId?: number,
    options?: SendToGroupOptions,
    abortSignal?: AbortSignalLike): Promise<void|AckResult> {
      if (options == null) {
        options = {fireAndForget: false, noEcho: false};
      }

      let noEcho = options.noEcho;

      if (!options.fireAndForget) {
        return await this.sendMessageWithAckId(id => {
          return {
            _type: UpstreamMessageType.SendToGroup,
            group: groupName,
            dataType: dataType,
            data: content,
            ackId: id,
            noEcho: noEcho,
          } as SendToGroupMessage;
        }, ackId, abortSignal); 
      };

      const message =  {
        _type: UpstreamMessageType.SendToGroup,
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

      socket.onopen = _ => {
        this._socket = socket;
        this._state = WebPubSubClientState.Connected;
        if (this._sequenceAckTask != null) {
          this._sequenceAckTask.abort();
        }
        this._sequenceAckTask = new AbortableTask(async () => {
          let [isUpdated, seqId] = this._sequenceId.tryGetSequenceId();
          if (isUpdated) {
            const message: SequenceAckMessage = {
              _type: UpstreamMessageType.SequenceAck,
              sequenceId: seqId!
            }
            await this.sendMessage(message);
          }
        }, 1000);
        resolve();
      }

      socket.onerror = e => {
        if (this._sequenceAckTask != null) {
          this._sequenceAckTask.abort();
        }
        reject(e.error);
      }

      socket.onclose = e => {
        if (this._state == WebPubSubClientState.Connected) {
          if (this._sequenceAckTask != null) {
            this._sequenceAckTask.abort();
          }
          this._lastCloseEvent = e;
          if (e.code == 1008) {
            console.warn("The websocket close with status code 1008. Stop recovery.");
            this.raiseClose.call(this);
          } else {
            this.tryRecovery.call(this);
          }
        } else {
          reject(e.reason);
        }
      }

      socket.onmessage = (event: MessageEvent) => {
        // console.log(`Received message: ${JSON.stringify(event.data)}`);

        const handleAck = (message: AckMessage): void => {
          if (this._ackMap.has(message.ackId)) {
            let entity = this._ackMap.get(message.ackId)!;
            if (message.success || (message.error && message.error.name == "Duplicate")) {
              entity.resolve({ack: message});
            } else {
              entity.reject(new SendMessageError("Failed to send message.", message));
            }
          }
        };

        const handleConnected = async (message: ConnectedMessage): Promise<void> => {
          this._connectionId = message.connectionId;
          this._reconnectionToken = message.reconnectionToken;
      
          if (!this._isInitialConnected) {
            this._isInitialConnected = true;
            if (this.onConnected != null) {
              let groups: string[] = [];
              this._groupMap.forEach(g => {
                if (g.isJoined) {
                  groups.push(g.name);
                }
              });

              await this.onConnected({message: message, groupsInfo: {groups: groups}});
            }
          }
        };

        const handleDisconnected = (message: DisconnectedMessage): void => {
          this._lastDisconnectedMessage = message;
        }

        const handleGroupData = async (message: GroupDataMessage): Promise<void> => {
          if (message.sequenceId != null) {
            if (!this._sequenceId.tryUpdate(message.sequenceId))
            {
              // drop duplicated message
              return;
            }
          }
          if (this._groupMap.has(message.group)) {
            let group = this._groupMap.get(message.group)
            if (group?.callback != null) {
              try {
                await group.callback({message: message});
              } catch {}
            }
          }
          if (this._onGroupMessage != null) {
            try {
              await this._onGroupMessage({message: message});
            } catch {}
          }
        }

        const handleServerData = async (message: ServerDataMessage): Promise<void> => {
          if (message.sequenceId != null) {
            if (!this._sequenceId.tryUpdate(message.sequenceId))
            {
              // drop duplicated message
              return;
            }
          }
          if (this.onServerMessage != null) {
            try {
              await this.onServerMessage({message: message});
            } catch {}
          }
        }

        let data = event.data;
        let convertedData : Buffer | ArrayBuffer | string;
        if (Array.isArray(data)) {
          convertedData = Buffer.concat(data);
        } else {
          convertedData = data;
        }
    
        let message = this._protocol.parseMessages(convertedData);
        switch (message._type) {
          case DownstreamMessageType.Ack: {
            handleAck(message as AckMessage);
            break;
          }
          case DownstreamMessageType.Connected: {
            handleConnected(message as ConnectedMessage);
            break;
          }
          case DownstreamMessageType.Disconnected: {
            handleDisconnected(message as DisconnectedMessage);
            break;
          }
          case DownstreamMessageType.GroupData: {
            handleGroupData(message as GroupDataMessage);
            break;
          }
          case DownstreamMessageType.ServerData: {
            handleServerData(message as ServerDataMessage);
            break;
          }
        }
      };
      socket.binaryType = "arraybuffer";
    });
  }

  private async raiseClose(): Promise<void> {
    if (this.onDisconnected) {
      await this.onDisconnected({message: this._lastDisconnectedMessage, event: this._lastCloseEvent});
    }
  }

  private async sendMessage(message: WebPubSubMessage, abortSignal?: AbortSignalLike): Promise<void> {
    // console.log(`Sending message: ${JSON.stringify(message)}`);
    let payload = this._protocol.writeMessage(message);

    if (this._socket == null || this._socket.readyState != WebSocket.OPEN) {
      throw new Error("The connection is not connected.");
    }
    await sendAsync(this._socket, payload, abortSignal);
  }

  private async sendMessageWithAckId(messageProvider: (ackId: number) => WebPubSubMessage, ackId?: number, abortSignal?: AbortSignalLike): Promise<AckResult> {
    if (ackId == null) {
      ackId = this.nextAckId();
    }
    
    const message = messageProvider(ackId);
    if (!this._ackMap.has(ackId)) {
      this._ackMap.set(ackId, new AckEntity())
    }
    let entity = this._ackMap.get(ackId)!;

    try
    {
      await this.sendMessage(message, abortSignal);
    } catch (error) {
      this._ackMap.delete(ackId);
      throw error;
    }

    return await entity.promise();
  }

  private async tryRecovery(): Promise<void> {
    // Clean ack cache
    if (this._isStopped) {
      console.warn("The client is stopped. Stop recovery.");
      this.raiseClose();
      return;
    }

    if (!this._protocol.isReliableSubProtocol) {
      console.warn("The protocol is not reliable, recovery is not applicable");
      this.raiseClose();
      return;
    }

    // Build recovery uri
    let recoveryUri = this.buildRecoveryUri();
    if (!recoveryUri) {
      console.warn("Connection id or reconnection token is not available");
      this.raiseClose();
      return;
    }

    let abortSignal = AbortController.timeout(30 * 1000);
    let timeout = delay(30 * 1000).then(() => abortSignal.onabort) // 30s
    while (timeout) {
      try {
        await this.connectCore.call(this, recoveryUri);
        return;
      } catch {
        await delay(1000);
      }
    }

  }

  private buildDefaultOptions(): WebPubSubClientOptions {
    return <WebPubSubClientOptions> {
      protocol: new WebPubSubJsonReliableProtocol(),
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

  private getOrAddGroup(name: string): WebPubSubGroup {
    if (!this._groupMap.has(name)) {
      this._groupMap.set(name, new WebPubSubGroup(name));
    }
    return this._groupMap.get(name) as WebPubSubGroup; 
  }
}

function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time));
}

function sendAsync(socket: WebSocket, data: any, _?: AbortSignalLike): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.send(data, err => {
      if (err) {
        reject(err)
      } else {
        resolve();
      }
    });
  })
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
  public callback?: OnGroupMessage;

  constructor(name: string) {
    this.name = name;
  }
}

class AckEntity {
  private readonly _deferred: Deferred<AckResult>;

  constructor() {
    this._deferred = new Deferred();
  }

  promise() {
    return this._deferred.promise;
  }

  resolve(value: AckResult | PromiseLike<AckResult>) {
    this._deferred.resolve(value);
  }

  reject(reason?: any) {
    this._deferred.reject(reason);
  }
}

class Deferred<T> {
  private readonly _promise: Promise<T>
  private _resolve?: (value: T | PromiseLike<T>) => void
  private _reject?: (reason?: any) => void

  constructor () {
    this._promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve
      this._reject = reject
    })
  }

  get promise (): Promise<T> {
    return this._promise
  }

  resolve = (value: T | PromiseLike<T>): void => {
    this._resolve!(value);
  }

  reject = (reason?: any): void => {
      this._reject!(reason)
  }
}

class SequenceId {
  private _sequenceId: number;
  private _isUpdate: boolean;

  constructor() {
    this._sequenceId = 0;
    this._isUpdate = false;
  }

  tryUpdate(sequenceId: number): boolean {
    this._isUpdate = true;
    if (sequenceId > this._sequenceId) {
      this._sequenceId = sequenceId;
      return true;
    }
    return false;
  }

  tryGetSequenceId(): [boolean, number|null] {
    if (this._isUpdate) {
      this._isUpdate = false;
      return [true, this._sequenceId];
    }

    return [false, null];
  }
}

class AbortableTask {
  private readonly _func: (obj?: any) => Promise<void>;
  private readonly _abortController: AbortController;
  private readonly _interval: number;
  private readonly _obj?: any;

  constructor(func: (obj?: any) => Promise<void>, interval: number, obj?: any) {
    this._func = func;
    this._abortController = new AbortController();
    this._interval = interval;
    this._obj = obj;
    this.start()
  }

  public abort() {
    try {
      this._abortController.abort();
    } catch {
    }
  }

  private async start(): Promise<void> {
    let signal = this._abortController.signal;
    while (!signal.aborted) {
      try {
        await this._func(this._obj);
      } catch {
      } finally {
        await delay(this._interval);
      }
    }
  }
}
