export interface WebPubSubMessage {
  _type: DownstreamMessageType | UpstreamMessageType
}

export enum DownstreamMessageType {
  Ack = 'Ack',
  Connected = 'Connected',
  Disconnected = 'Disconnected',
  GroupData = 'GroupData',
  ServerData = 'ServerData',
}

export enum UpstreamMessageType {
  JoinGroup = 'JoinGroup',
  LeaveGroup = 'LeaveGroup',
  SendToGroup = 'SendToGroup',
  SendEvent = 'SendEvent',
  SequenceAck = 'SequenceAck',
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
  data: any;
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
  data: any;
  event: string;
}

export interface SendToGroupMessage extends WebPubSubMessage {
  readonly _type: UpstreamMessageType.SendToGroup;
  group: string;
  ackId?: number;
  dataType: WebPubSubDataType;
  data: any;
  noEcho: boolean;
}

export interface SequenceAckMessage extends WebPubSubMessage {
  readonly _type: UpstreamMessageType.SequenceAck;
  sequenceId: number;
}

export enum WebPubSubDataType {
  Binary = 'Binary',
  Json = 'Json',
  Text = 'Text',
  Protobuf = 'Protobuf',
}
