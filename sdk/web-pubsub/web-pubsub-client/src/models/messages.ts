import { JSONTypes } from "../webPubSubClient";

export interface WebPubSubMessage {
  _type: DownstreamMessageType | UpstreamMessageType
}

export enum DownstreamMessageType {
  Ack = 'ack',
  Connected = 'connected',
  Disconnected = 'disconnected',
  GroupData = 'groupData',
  ServerData = 'serverData',
}

export enum UpstreamMessageType {
  JoinGroup = 'joinGroup',
  LeaveGroup = 'leaveGroup',
  SendToGroup = 'sendToGroup',
  SendEvent = 'sendEvent',
  SequenceAck = 'sequenceAck',
}

export interface AckMessage extends WebPubSubMessage {
  readonly _type: DownstreamMessageType.Ack;
  ackId: number;
  success: boolean;
  error?: ErrorDetail;
}

export interface ErrorDetail {
  name: string;
  message: string;
}

export interface ConnectedMessage extends WebPubSubMessage {
  readonly _type: DownstreamMessageType.Connected;
  connectionId: string;
  userId: string;
  reconnectionToken: string;
}

export interface DisconnectedMessage extends WebPubSubMessage {
  readonly _type: DownstreamMessageType.Disconnected;
  message: string;
}

export interface DataMessage extends WebPubSubMessage {
  dataType: WebPubSubDataType;
  data: JSONTypes | ArrayBuffer;
  sequenceId?: number;
}

export interface GroupDataMessage extends DataMessage {
  readonly _type: DownstreamMessageType.GroupData;
  group: string;
  fromUserId: string;
}

export interface ServerDataMessage extends DataMessage {
  readonly _type: DownstreamMessageType.ServerData;
}

export interface JoinGroupMessage extends WebPubSubMessage {
  readonly _type: UpstreamMessageType.JoinGroup;
  group: string;
  ackId?: number;
}

export interface LeaveGroupMessage extends WebPubSubMessage {
  readonly _type: UpstreamMessageType.LeaveGroup;
  group: string;
  ackId?: number;
}

export interface SendEventMessage extends WebPubSubMessage {
  readonly _type: UpstreamMessageType.SendEvent;
  ackId?: number;
  dataType: WebPubSubDataType;
  data: JSONTypes | ArrayBuffer;
  event: string;
}

export interface SendToGroupMessage extends WebPubSubMessage {
  readonly _type: UpstreamMessageType.SendToGroup;
  group: string;
  ackId?: number;
  dataType: WebPubSubDataType;
  data: JSONTypes | ArrayBuffer;
  noEcho: boolean;
}

export interface SequenceAckMessage extends WebPubSubMessage {
  readonly _type: UpstreamMessageType.SequenceAck;
  sequenceId: number;
}

export enum WebPubSubDataType {
  Binary = 'binary',
  Json = 'json',
  Text = 'text',
  Protobuf = 'protobuf',
}
