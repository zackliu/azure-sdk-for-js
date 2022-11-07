// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AbortSignalLike } from "@azure/abort-controller";
import { WebPubSubClientProtocol } from "../protocols";
import { DisconnectedMessage, GroupDataMessage, ServerDataMessage } from "./messages";

/**
 * The client options
 */
export interface WebPubSubClientOptions {
  /**
   * The subprotocol
   */
  protocol: WebPubSubClientProtocol;
  /**
   * The reconnection related options
   */
  reconnectionOptions: ReconnectionOptions;  
}

/**
 * The start options
 */
 export interface StartOptions {
  /**
   * The abort signal
   */
   abortSignal?: AbortSignalLike; 
}

/**
 * The reconnection related options
 */
export interface ReconnectionOptions {
  /**
   * Whether to auto reconnect after connection is dropped and not recoverable
   */
  autoReconnect: boolean;
}

/**
 * Join group operation options
 */
export interface JoinGroupOptions {
  /**
   * The optional ackId. If not specified, client will generate one. 
   */
  ackId?: number;
  /**
   * The abort signal
   */
  abortSignal?: AbortSignalLike;
}

/**
 * Leave group operation options
 */
 export interface LeaveGroupOptions {
  /**
   * The optional ackId. If not specified, client will generate one. 
   */
  ackId?: number;
  /**
   * The abort signal
   */
  abortSignal?: AbortSignalLike;
}

/**
 * Send to group operation options
 */
export interface SendToGroupOptions {
  /**
   * Whether the message needs to echo to sender
   */
  noEcho: boolean;
  /**
   * If true, the message won't contains ackId. No AckMessage will be returned from the service.
   */
  fireAndForget:boolean;
  /**
   * The optional ackId. If not specified, client will generate one. 
   */
  ackId?: number;
  /**
  * The abort signal
  */
  abortSignal?: AbortSignalLike;
}

/**
 * Send event operation options
 */
export interface SendEventOptions {
  /**
   * If true, the message won't contains ackId. No AckMessage will be returned from the service.
   */
  fireAndForget:boolean;
  /**
   * The optional ackId. If not specified, client will generate one. 
   */
  ackId?: number;
  /**
  * The abort signal
  */
  abortSignal?: AbortSignalLike;
}

/**
 * Parameter of OnConnected callback
 */
export interface OnConnectedArgs {
  /**
   * The connection id
   */
   connectionId: string;
   /**
    * The user id of the client connection
    */
   userId: string;
  /**
   * Groups that joined from client will be restore after reconnection. Groups that join or leave from server won't be taken into consideration.
   */
  groupRestoreState: Map<string, Error|null>;
}

/**
 * Parameter of OnDisconnected callback
 */
export interface OnDisconnectedArgs {
  /**
   * The disconnected message
   */
  message?: DisconnectedMessage;
}

/**
 * Parameter of OnStopped callback
 */
 export interface OnStoppedArgs {
}

/**
 * Parameter of OnDataMessage callback
 */
export interface OnServerDataMessageArgs {
  /**
   * The data message
   */
  message: ServerDataMessage;
}

/**
 * Parameter of OnGroupDataMessage callback
 */
export interface OnGroupDataMessageArgs {
  /**
   * The group data message
   */
  message: GroupDataMessage;
}

/**
 * Parameter of RestoreGroupFailed callback
 */
 export interface OnRestoreGroupFailedArgs {
  /**
   * The group data message
   */
  message: GroupDataMessage;
}

/**
 * The ack result
 */
export interface WebPubSubResult {
  /**
   * The ack message from the service
   */
  ackId: number;
}

/**
 * The start options
 */
 export interface GetClientAccessUrlOptions {
  /**
   * The abort signal
   */
   abortSignal?: AbortSignalLike; 
}

export * from "./messages"