// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AbortController, AbortSignalLike } from "@azure/abort-controller";
import EventEmitter from "events";
import WebSocket, { CloseEvent, MessageEvent } from "ws";
import { SendMessageError, SendMessageErrorOptions } from "./errors";
import { WebPubSubResult, JoinGroupOptions, LeaveGroupOptions, OnConnectedArgs, OnDisconnectedArgs, OnGroupDataMessageArgs, OnServerDataMessageArgs, OnStoppedArgs, WebPubSubRetryOptions, SendEventOptions, SendToGroupOptions, WebPubSubClientOptions, OnRestoreGroupFailedArgs, StartOptions, GetClientAccessUrlOptions } from "./models";
import { ConnectedMessage, DisconnectedMessage, GroupDataMessage, ServerDataMessage, WebPubSubDataType, WebPubSubMessage, JoinGroupMessage, LeaveGroupMessage, SendToGroupMessage, SendEventMessage, AckMessage, SequenceAckMessage} from "./models/messages";
import { WebPubSubClientProtocol, WebPubSubJsonReliableProtocol } from "./protocols";
import { DefaultWebPubSubClientCredential, WebPubSubClientCredential } from "./webPubSubClientCredential";

/**
 * Types which can be serialized and sent as JSON.
 */
export type JSONTypes = string | number | boolean | object;

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

  private readonly _emitter: EventEmitter = new EventEmitter();
  private _state: WebPubSubClientState;
  private _isStopping: boolean = false;
  private _ackId: number;
  
  // connection lifetime
  private _socket?: WebSocket;
  private _uri?: string;
  private _lastCloseEvent?: CloseEvent;
  private _lastDisconnectedMessage?: DisconnectedMessage
  private _connectionId?: string;
  private _reconnectionToken?: string;
  private _isInitialConnected = false;
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

    if (options == null) {
      options = {};
    }
    this.buildDefaultOptions(options);
    this._options = options;

    this._protocol = this._options.protocol!;
    this._groupMap = new Map<string, WebPubSubGroup>();
    this._ackMap = new Map<number, AckEntity>();
    this._sequenceId = new SequenceId();

    this._state = WebPubSubClientState.Stopped;
    this._ackId = 0;
  }

  /**
   * Start to start to the service.
   * @param abortSignal The abort signal
   */
  public async start(options?: StartOptions) : Promise<void> {
    if (this._isStopping) {
      console.error("Can't start a client during stopping");
      return;
    }

    if (this._state != WebPubSubClientState.Stopped) {
      console.warn("Client can be only started when it's Stopped");
      return;
    }
    
    let abortSignal: AbortSignalLike | undefined;
    if (options) {
      abortSignal = options.abortSignal;
    }

    try {
      await this.startCore(abortSignal);
    } catch (err) {
      // this two sentense should be set together. Consider client.stop() is called during startCore()
      this.ChangeState(WebPubSubClientState.Stopped);
      this._isStopping = false;
      throw err;
    }
  }

  private async startFromRestarting(abortSignal?: AbortSignalLike): Promise<void> {
    if (this._state != WebPubSubClientState.Disconnected) {
      console.warn("Client can be only restarted when it's Disconnected");
      return;
    }

    try {
      await this.startCore(abortSignal);
    } catch (err) {
      this.ChangeState(WebPubSubClientState.Disconnected);      
      throw err;
    }
  }

  private async startCore(abortSignal?: AbortSignalLike): Promise<void> {
    this.ChangeState(WebPubSubClientState.Connecting);      

    console.info("Staring a new connection");
    // Reset before a pure new connection
    this._sequenceId.reset();
    this._isInitialConnected = false;
    this._lastCloseEvent = undefined;
    this._lastDisconnectedMessage = undefined;
    this._connectionId = undefined;
    this._reconnectionToken = undefined;
    this._uri = undefined;

    this._uri = await this._credential.getClientAccessUrl({abortSignal: abortSignal} as GetClientAccessUrlOptions);
    await this.connectCore(this._uri);
  }

  /**
   * Stop the client.
   */
  public stop() {
    if (this._state == WebPubSubClientState.Stopped || this._isStopping) {
      return;
    }

    this._isStopping = true;
    if (this._socket) {
      this._socket.close();
    }
  }

  /**
   * Add handler for connected event
   * @param event The event name
   * @param listener The handler
   */
  public on(event: "connected", listener: (e: OnConnectedArgs) => void): void;
  /**
   * Add handler for disconnected event
   * @param event The event name
   * @param listener The handler
   */
  public on(event: "disconnected", listener: (e: OnDisconnectedArgs) => void): void;
  /**
   * Add handler for stopped event
   * @param event The event name
   * @param listener The handler
   */
  public on(event: "stopped", listener: (e: OnStoppedArgs) => void): void;
  /**
   * Add handler for server messages
   * @param event The event name
   * @param listener The handler
   */
  public on(event: "server-message", listener: (e: OnServerDataMessageArgs) => void): void;
  /**
   * Add handler for group messags
   * @param event The event name
   * @param listener The handler
   */
  public on(event: "group-message", listener: (e: OnGroupDataMessageArgs) => void): void;
  /**
   * Add handler for restoring group failed
   * @param event The event name
   * @param listener  The handler
   */
  public on(event: "restore-group-failed", listener: (e: OnRestoreGroupFailedArgs) => void): void;
  public on(event: "connected" | "disconnected" | "stopped" | "server-message" | "group-message" | "restore-group-failed", listener: (e: any) => void): void {
    this._emitter.on(event, listener);
  }

  /**
   * Remove handler for connected event
   * @param event The event name
   * @param listener The handler
   */
  public off(event: "connected", listener: (e: OnConnectedArgs) => void): void;
  /**
   * Remove handler for disconnected event
   * @param event The event name
   * @param listener The handler
   */
  public off(event: "disconnected", listener: (e: OnDisconnectedArgs) => void): void;
  /**
   * Remove handler for stopped event
   * @param event The event name
   * @param listener The handler
   */
  public off(event: "stopped", listener: (e: OnStoppedArgs) => void): void;
  /**
   * Remove handler for server message
   * @param event The event name
   * @param listener The handler
   */
  public off(event: "server-message", listener: (e: OnServerDataMessageArgs) => void): void;
  /**
   * Remove handler for group message
   * @param event The event name
   * @param listener The handler
   */
  public off(event: "group-message", listener: (e: OnGroupDataMessageArgs) => void): void;
  /**
   * Add handler for restoring group failed
   * @param event The event name
   * @param listener  The handler
   */
  public off(event: "restore-group-failed", listener: (e: OnRestoreGroupFailedArgs) => void): void;
  public off(event: "connected" | "disconnected" | "stopped" | "server-message" | "group-message" | "restore-group-failed", listener: (e: any) => void): void {
    this._emitter.removeListener(event, listener);
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
  public async sendEvent(eventName: string,
     content: JSONTypes | ArrayBuffer,
     dataType: WebPubSubDataType,
     options?: SendEventOptions): Promise<void|WebPubSubResult> {
      if (options == null) {
        options = {fireAndForget: false};
      }

      if (!options.fireAndForget) {
        return await this.sendMessageWithAckId(id => {
          return {
            kind: "sendEvent",
            dataType: dataType,
            data: content,
            ackId: id,
            event: eventName
          } as SendEventMessage;
        }, options.ackId, options.abortSignal); 
      };

      const message =  {
        kind: "sendEvent",
        dataType: dataType,
        data: content,
        event: eventName
      } as SendEventMessage

      return await this.sendMessage(message, options.abortSignal);
  }

  private async sendEventAttempt(eventName: string,
    content: JSONTypes | ArrayBuffer,
    dataType: WebPubSubDataType,
    options?: SendEventOptions): Promise<void|WebPubSubResult> {
     if (options == null) {
       options = {fireAndForget: false};
     }

     if (!options.fireAndForget) {
       return await this.sendMessageWithAckId(id => {
         return {
           kind: "sendEvent",
           dataType: dataType,
           data: content,
           ackId: id,
           event: eventName
         } as SendEventMessage;
       }, options.ackId, options.abortSignal); 
     };

     const message =  {
       kind: "sendEvent",
       dataType: dataType,
       data: content,
       event: eventName
     } as SendEventMessage

     return await this.sendMessage(message, options.abortSignal);
 }

  /**
   * Join the client to group
   * @param groupName The group name
   * @param options The join group options
   */
   public async joinGroup(groupName: string, options?: JoinGroupOptions) {
      let group = this.getOrAddGroup(groupName);
      let result = await this.JoinGroupCore(groupName, options);
      group.isJoined = true;
      return result;
   }


  private async JoinGroupCore(groupName: string, options?: JoinGroupOptions): Promise<WebPubSubResult> {
    options = options || {} as JoinGroupOptions;

    return await this.sendMessageWithAckId(id => {
      return {
        group: groupName,
        ackId: id,
        kind: "joinGroup"
      } as JoinGroupMessage;
    }, options.ackId, options.abortSignal);
  }

  /**
   * Leave the client from group
   * @param groupName The group name
   * @param ackId The optional ackId. If not specified, client will generate one. 
   * @param abortSignal The abort signal
   */
  public async leaveGroup(groupName: string, options?: LeaveGroupOptions): Promise<WebPubSubResult> {
    let group = this.getOrAddGroup(groupName);
    
    options = options || {} as LeaveGroupOptions;

    let result = await this.sendMessageWithAckId(id => {
      return {
        group: groupName,
        ackId: id,
        kind: "leaveGroup"
      } as LeaveGroupMessage;
    }, options.ackId, options.abortSignal);
    group.isJoined = false;
    return result;
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
    options?: SendToGroupOptions): Promise<void|WebPubSubResult> {
      if (options == null) {
        options = {fireAndForget: false, noEcho: false};
      }

      let noEcho = options.noEcho;

      if (!options.fireAndForget) {
        return await this.sendMessageWithAckId(id => {
          return {
            kind: "sendToGroup",
            group: groupName,
            dataType: dataType,
            data: content,
            ackId: id,
            noEcho: noEcho,
          } as SendToGroupMessage;
        }, options.ackId, options.abortSignal); 
      };

      const message =  {
        kind: "sendToGroup",
        group: groupName,
        dataType: dataType,
        data: content,
        noEcho: noEcho,
      } as SendToGroupMessage

      return await this.sendMessage(message, options.abortSignal);
  }

  private connectCore(uri: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let socket = new WebSocket(uri, this._protocol.name);

      socket.onopen = _ => {
        // There's a case that client called stop() before this method. We need to check and close it if it's the case.
        if (this._isStopping) {
          try {
            socket.close();
          } catch {}

          reject();
        }
        this._socket = socket;
        this._state = WebPubSubClientState.Connected;
        if (this._protocol.isReliableSubProtocol) {
          if (this._sequenceAckTask != null) {
            this._sequenceAckTask.abort();
          }
          this._sequenceAckTask = new AbortableTask(async () => {
            let [isUpdated, seqId] = this._sequenceId.tryGetSequenceId();
            if (isUpdated) {
              const message: SequenceAckMessage = {
                kind: "sequenceAck",
                sequenceId: seqId!
              }
              await this.sendMessage(message);
            }
          }, 1000);
        }
        
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
          this.handleConnectionClose.call(this);
        } else {
          reject(e.reason);
        }
      }

      socket.onmessage = (event: MessageEvent) => {
        const handleAck = (message: AckMessage): void => {
          if (this._ackMap.has(message.ackId)) {
            let entity = this._ackMap.get(message.ackId)!;
            if (message.success || (message.error && message.error.name == "Duplicate")) {
              entity.resolve({ackId: message.ackId});
            } else {
              entity.reject(new SendMessageError("Failed to send message.", {ackId: message.ackId, errorDetail: message.error} as SendMessageErrorOptions));
            }
          }
        };

        const handleConnected = async (message: ConnectedMessage): Promise<void> => {
          this._connectionId = message.connectionId;
          this._reconnectionToken = message.reconnectionToken;
      
          if (!this._isInitialConnected) {
            this._isInitialConnected = true;
            
            let restoreResult: Map<string,Error|null> = new Map<string, Error|null>();
            let groupPromises: Promise<void>[] = [];
            this._groupMap.forEach(g => {
              if (g.isJoined) {
                groupPromises.push((async() => {
                  try {
                    await this.JoinGroupCore(g.name);
                    restoreResult.set(g.name, null);
                  } catch (err) {
                    restoreResult.set(g.name, err as Error);
                  }
                })());
              }
            });
            
            try {
              await Promise.all(groupPromises)
            } catch {}
            
            let arg: OnConnectedArgs = {
              connectionId: message.connectionId,
              userId: message.userId,
              groupRestoreState: restoreResult,
            };
            this._emitter.emit('connected', arg);
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
          // if (this._groupMap.has(message.group)) {
          //   let group = this._groupMap.get(message.group)
          //   if (group?.callback != null) {
          //     try {
          //       await group.callback({message: message});
          //     } catch {}
          //   }
          // }
          
          let arg: OnGroupDataMessageArgs = {
            message: message, 
          };
          this._emitter.emit('group-message', arg);
        }

        const handleServerData = async (message: ServerDataMessage): Promise<void> => {
          if (message.sequenceId != null) {
            if (!this._sequenceId.tryUpdate(message.sequenceId))
            {
              // drop duplicated message
              return;
            }
          }

          let arg: OnServerDataMessageArgs = {
            message: message, 
          };
          this._emitter.emit('server-message', arg);
        }

        let data = event.data;
        let convertedData : Buffer | ArrayBuffer | string;
        if (Array.isArray(data)) {
          convertedData = Buffer.concat(data);
        } else {
          convertedData = data;
        }
    
        let message = this._protocol.parseMessages(convertedData);
        switch (message.kind) {
          case "ack": {
            handleAck(message as AckMessage);
            break;
          }
          case "connected": {
            handleConnected(message as ConnectedMessage);
            break;
          }
          case "disconnected": {
            handleDisconnected(message as DisconnectedMessage);
            break;
          }
          case "groupData": {
            handleGroupData(message as GroupDataMessage);
            break;
          }
          case "serverData": {
            handleServerData(message as ServerDataMessage);
            break;
          }
        }
      };
      socket.binaryType = "arraybuffer";
    });
  }

  private async handleConnectionCloseAndNoRecovery(): Promise<void> {
    this._state = WebPubSubClientState.Disconnected;
    let arg: OnDisconnectedArgs = {message: this._lastDisconnectedMessage};
    this._emitter.emit("disconnected", arg);

    // Auto reconnect or stop
    if (this._options.reconnectionOptions.autoReconnect) {
      await this.autoReconnect();
    } else {
      await this.handleConnectionStopped();
    }
  }

  private async autoReconnect(): Promise<void> {
    let isSuccess = false;
    try {
      while (!this._isStopping) {
        try {
          await this.startFromRestarting();
          isSuccess = true;
          break;
        } catch {
          await delay(1000);
        }
      }
    } finally {
      if (!isSuccess) {
        this.handleConnectionStopped();
      }
    }
  }

  private handleConnectionStopped(): void {
    this._isStopping = false;
    this._state = WebPubSubClientState.Stopped;
    this._emitter.emit("stopped", {});
  }

  private async sendMessage(message: WebPubSubMessage, abortSignal?: AbortSignalLike): Promise<void> {
    // console.log(`Sending message: ${JSON.stringify(message)}`);
    let payload = this._protocol.writeMessage(message);

    if (this._socket == null || this._socket.readyState != WebSocket.OPEN) {
      throw new Error("The connection is not connected.");
    }
    await sendAsync(this._socket, payload, abortSignal);
  }

  private async sendMessageWithAckId(messageProvider: (ackId: number) => WebPubSubMessage, ackId?: number, abortSignal?: AbortSignalLike): Promise<WebPubSubResult> {
    if (ackId == null) {
      ackId = this.nextAckId();
    }
    
    const message = messageProvider(ackId);
    if (!this._ackMap.has(ackId)) {
      this._ackMap.set(ackId, new AckEntity(ackId))
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

  private async handleConnectionClose(): Promise<void> {
    // Clean ack cache
    this._ackMap.forEach((value, key) => {
      if (this._ackMap.delete(key)) {
        value.reject(new SendMessageError("Connection is disconnected before receive ack from the service", {ackId: value.ackId} as SendMessageErrorOptions ));
      }
    });

    if (this._isStopping) {
      console.warn("The client is stopping state. Stop recovery.");
      this.handleConnectionCloseAndNoRecovery();
      return;
    }

    if (this._lastCloseEvent && this._lastCloseEvent.code == 1008) {
      console.warn("The websocket close with status code 1008. Stop recovery.");
      this.handleConnectionCloseAndNoRecovery();
      return;
    }

    if (!this._protocol.isReliableSubProtocol) {
      console.warn("The protocol is not reliable, recovery is not applicable");
      this.handleConnectionCloseAndNoRecovery();
      return;
    }

    // Build recovery uri
    let recoveryUri = this.buildRecoveryUri();
    if (!recoveryUri) {
      console.warn("Connection id or reconnection token is not available");
      this.handleConnectionCloseAndNoRecovery();
      return;
    }

    // Try recover connection
    let recovered = false;
    this._state = WebPubSubClientState.Recovering;
    let abortSignal = AbortController.timeout(30 * 1000);
    try {
      while (!abortSignal.aborted || this._isStopping) {
        try {
          await this.connectCore.call(this, recoveryUri);
          recovered = true;
          return;
        } catch {
          await delay(1000);
        }
      }
    } finally {
      if (!recovered) {
        console.warn("Recovery attempts failed more then 30 seconds or the client is stopping");
        this.handleConnectionCloseAndNoRecovery();
      }
    }
  }

  private buildDefaultOptions(clientOptions: WebPubSubClientOptions): WebPubSubClientOptions {
    if (clientOptions.autoReconnect == null) {
      clientOptions.autoReconnect = true;
    }

    if (clientOptions.autoRestoreGroups == null) {
      clientOptions.autoRestoreGroups = true;
    }

    if (clientOptions.protocol == null) {
      clientOptions.protocol = WebPubSubJsonReliableProtocol();
    }

    this.buildMessageRetryOptions(clientOptions);

    return clientOptions;
  }

  private buildMessageRetryOptions(clientOptions: WebPubSubClientOptions): void {
    if (!clientOptions.messageRetryOptions) {
      clientOptions.messageRetryOptions = {};
    }

    if (clientOptions.messageRetryOptions.maxRetries == null || clientOptions.messageRetryOptions.maxRetries < 0) {
      clientOptions.messageRetryOptions.maxRetries = 3;
    }

    if (clientOptions.messageRetryOptions.retryDelayInMs == null || clientOptions.messageRetryOptions.retryDelayInMs < 0) {
      clientOptions.messageRetryOptions.retryDelayInMs = 1000;
    }

    if (clientOptions.messageRetryOptions.maxRetryDelayInMs == null || clientOptions.messageRetryOptions.maxRetryDelayInMs < 0) {
      clientOptions.messageRetryOptions.maxRetryDelayInMs = 30000;
    }

    if (clientOptions.messageRetryOptions.mode == null) {
      clientOptions.messageRetryOptions.mode = "Fixed";
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

  private ChangeState(newState: WebPubSubClientState): void {
    console.debug(`The client state transfer from ${this._state.toString()} to ${newState.toString()}`);
    this._state = newState;
  }

  private async OperationExecuteWithRetry<T>(inner: Promise<T>): Promise<T> {
    
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
  Stopped = "Stopped",
  Disconnected = "Disconnected",
  Connecting = "Connecting",
  Connected = "Connected",
  Recovering = "Recovering",
}

class WebPubSubGroup {
  public readonly name: string;
  public isJoined = false;

  constructor(name: string) {
    this.name = name;
  }
}

class AckEntity {
  private readonly _deferred: Deferred<WebPubSubResult>;

  constructor(ackId: number) {
    this._deferred = new Deferred();
    this.ackId = ackId;
  }

  public ackId;

  promise() {
    return this._deferred.promise;
  }

  resolve(value: WebPubSubResult | PromiseLike<WebPubSubResult>) {
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

  reset() {
    this._sequenceId = 0;
    this._isUpdate = false;
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
