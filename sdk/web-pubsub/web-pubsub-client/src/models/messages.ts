// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { JSONTypes } from "../webPubSubClient";

/**
 * The WebPubSub message
 */
export interface WebPubSubMessage {
  _type: DownstreamMessageType | UpstreamMessageType
}

/**
 * Types for downstream messages
 */
export enum DownstreamMessageType {
  /**
   * Type for AckMessage
   */
  Ack = 'ack',
  /**
   * Type for ConnectedMessage
   */
  Connected = 'connected',
  /**
   * Type for DisconnectedMessage
   */
  Disconnected = 'disconnected',
  /**
   * Type for GroupDataMessage
   */
  GroupData = 'groupData',
  /**
   * Type for ServerDataMessage
   */
  ServerData = 'serverData',
}

/**
 * Types for upstream messages
 */
export enum UpstreamMessageType {
  /**
   * Type for JoinGroupMessage
   */
  JoinGroup = 'joinGroup',
  /**
   * Type for LeaveGroupMessage
   */
  LeaveGroup = 'leaveGroup',
  /**
   * Type for SendToGroupMessage
   */
  SendToGroup = 'sendToGroup',
  /**
   * Type for SendEventMessage
   */
  SendEvent = 'sendEvent',
  /**
   * Type for SequenceAckMessage
   */
  SequenceAck = 'sequenceAck',
}

/**
 * The ack message
 */
export interface AckMessage extends WebPubSubMessage {
  /**
   * Message type
   */
  readonly _type: DownstreamMessageType.Ack;
  /**
   * The correspending id
   */
  ackId: number;
  /**
   * Is operation success or not
   */
  success: boolean;
  /**
   * The error detail. Only available when success is false
   */
  error?: ErrorDetail;
}

/**
 * Error detail in AckMessage
 */
export interface ErrorDetail {
  /**
   * Error name
   */
  name: string;
  /**
   * Details error message
   */
  message: string;
}

/**
 * Connected message
 */
export interface ConnectedMessage extends WebPubSubMessage {
  /**
   * Message type
   */
  readonly _type: DownstreamMessageType.Connected;
  /**
   * The connection id
   */
  connectionId: string;
  /**
   * The user id of the client connection
   */
  userId: string;
  /**
   * The reconnection token. Only available in reliable protocols.
   */
  reconnectionToken: string;
}

/**
 * Disconnected message
 */
export interface DisconnectedMessage extends WebPubSubMessage {
  /**
   * Message type
   */
  readonly _type: DownstreamMessageType.Disconnected;
  /**
   * Reason of disconnection.
   */
  message: string;
}

/**
 * Group data message
 */
export interface GroupDataMessage extends WebPubSubMessage {
  /**
   * Message type
   */
  readonly _type: DownstreamMessageType.GroupData;
  /**
   * The data type
   */
   dataType: WebPubSubDataType;
   /**
    * The data
    */
   data: JSONTypes | ArrayBuffer;
   /**
    * The sequence id of the data. Only available in reliable protocols
    */
   sequenceId?: number;
  /**
   * The name of group that the message come from.
   */
  group: string;
  /**
   * The user id of the sender
   */
  fromUserId: string;
}

/**
 * Server data message
 */
export interface ServerDataMessage extends WebPubSubMessage {
  /**
   * Message type
   */
  readonly _type: DownstreamMessageType.ServerData;
  /**
   * The data type
   */
   dataType: WebPubSubDataType;
   /**
    * The data
    */
   data: JSONTypes | ArrayBuffer;
   /**
    * The sequence id of the data. Only available in reliable protocols
    */
   sequenceId?: number;
}

/**
 * Join group message
 */
export interface JoinGroupMessage extends WebPubSubMessage {
  /**
   * Message type
   */
  readonly _type: UpstreamMessageType.JoinGroup;
  /**
   * The group to join
   */
  group: string;
  /**
   * Optional ack id. If specified, an AckMessage with success or not will be returned with the same ackId
   */
  ackId?: number;
}

/**
 * Leave group message
 */
export interface LeaveGroupMessage extends WebPubSubMessage {
  /**
   * Message type
   */
  readonly _type: UpstreamMessageType.LeaveGroup;
  /**
   * The group to leave
   */
  group: string;
  /**
   * Optional ack id. If specified, an AckMessage with success or not will be returned with the same ackId
   */
  ackId?: number;
}

/**
 * Send custom event message
 */
export interface SendEventMessage extends WebPubSubMessage {
  /**
   * Message type
   */
  readonly _type: UpstreamMessageType.SendEvent;
  /**
   * Optional ack id. If specified, an AckMessage with success or not will be returned with the same ackId
   */
  ackId?: number;
  /**
   * The data type
   */
  dataType: WebPubSubDataType;
  /**
   * The data
   */
  data: JSONTypes | ArrayBuffer;
  /**
   * The event name
   */
  event: string;
}

/**
 * Send to group message
 */
export interface SendToGroupMessage extends WebPubSubMessage {
  /**
   * Message type
   */
  readonly _type: UpstreamMessageType.SendToGroup;
  /**
   * The group to send
   */
  group: string;
  /**
   * Optional ack id. If specified, an AckMessage with success or not will be returned with the same ackId
   */
  ackId?: number;
  /**
   * The data type
   */
  dataType: WebPubSubDataType;
  /**
   * The data
   */
  data: JSONTypes | ArrayBuffer;
  /**
   * Whether the message needs to echo to sender
   */
  noEcho: boolean;
}

/**
 * Sequence ack message
 */
export interface SequenceAckMessage extends WebPubSubMessage {
  /**
   * Message type
   */
  readonly _type: UpstreamMessageType.SequenceAck;
  /**
   * The sequence id
   */
  sequenceId: number;
}

/**
 * The data type
 */
export enum WebPubSubDataType {
  /**
   * Binary type
   */
  Binary = 'binary',
  /**
   * Json type
   */
  Json = 'json',
  /**
   * Text type
   */
  Text = 'text',
  /**
   * Protobuf type
   */
  Protobuf = 'protobuf',
}
