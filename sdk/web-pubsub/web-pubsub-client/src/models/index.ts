// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CloseEvent } from "ws";
import { WebPubSubClientProtocol } from "../protocols";
import { AckMessage, ConnectedMessage, DisconnectedMessage, GroupDataMessage, ServerDataMessage } from "./messages";

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
 * The reconnection related options
 */
export interface ReconnectionOptions {
  /**
   * Whether to auto reconnect after connection is dropped and not recoverable
   */
  autoReconnect: boolean;
  /**
   * Whether to auto re-join groups after reconnect.
   */
  autoRejoinGroups: boolean;
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
}

/**
 * Send to server operation options
 */
export interface SendToServerOptions {
  /**
   * If true, the message won't contains ackId. No AckMessage will be returned from the service.
   */
  fireAndForget:boolean;
}

/**
 * Groups that currently the client should in from client sdk's perspective. Groups that join or leave from server won't be taken into consideration.
 */
export interface GroupsInfo {
  /**
   * Current groups
   */
  groups: string[];
}

/**
 * Parameter of OnConnected callback
 */
export interface OnConnectedArgs {
  /**
   * The connected message
   */
  message: ConnectedMessage;
  /**
   * Groups that currently the client should in from client sdk's perspective. Groups that join or leave from server won't be taken into consideration.
   */
  groupsInfo: GroupsInfo;
}

/**
 * Parameter of OnDisconnected callback
 */
export interface OnDisconnectedArgs {
  /**
   * The disconnected message
   */
  message?: DisconnectedMessage;
  /**
   * The websocket close event
   */
  event?: CloseEvent;
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
 * The ack result
 */
export interface AckResult {
  /**
   * The ack message from the service
   */
  ack: AckMessage;
}

export * from "./messages"