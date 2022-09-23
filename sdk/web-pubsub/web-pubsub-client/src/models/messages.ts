export interface WebPubSubMessage {
  type: DownstreamMessageType | UpstreamMessageType
}

export enum DownstreamMessageType {
  Ack = 1,
  Connected = 2,
  Disconnected = 3,
  GroupData = 4,
  ServerData = 5,
}

export enum UpstreamMessageType {
  JoinGroup = 1,
  LeaveGroup = 2,
  SendToGroup = 3,
  SendEvent = 4,
  SequenceAck = 5,
}

export interface AckMessage extends WebPubSubMessage {
  readonly type: DownstreamMessageType.Ack;
  ackId: bigint;
  success: boolean;
  error?: ErrorDetail;
}

export interface ErrorDetail {
  name: string;
  message: string;
}

export interface ConnectedMessage extends WebPubSubMessage {
  readonly type: DownstreamMessageType.Connected;
  connectionId: string;
  userId: string;
  reconnectionToken: string;
}

export interface DisconnectedMessage extends WebPubSubMessage {
  readonly type: DownstreamMessageType.Disconnected;
  reason: string;
}

export interface DataMessage extends WebPubSubMessage {
  dataType: WebPubSubDataType;
  data: any;
  sequenceId?: bigint;
}

export interface GroupDataMessage extends DataMessage {
  readonly type: DownstreamMessageType.GroupData;
  group: string;
  fromUserId: string;
}

export interface ServerDataMessage extends DataMessage {
  readonly type: DownstreamMessageType.ServerData;
}

export interface JoinGroupMessage extends WebPubSubMessage {
  readonly type: UpstreamMessageType.JoinGroup;
  group: string;
  ackId?: bigint;
}

export interface LeaveGroupMessage extends WebPubSubMessage {
  readonly type: UpstreamMessageType.LeaveGroup;
  group: string;
  ackId?: bigint;
}

export interface SendEventMessage extends WebPubSubMessage {
  readonly type: UpstreamMessageType.SendEvent;
  ackId?: bigint;
  dataType: WebPubSubDataType;
  data: any;
  eventName: string;
}

export interface SendToGroupMessage extends WebPubSubMessage {
  readonly type: UpstreamMessageType.SendToGroup;
  group: string;
  ackId?: bigint;
  dataType: WebPubSubDataType;
  data: any;
  noEcho: boolean;
}

export interface SequenceAckMessage extends WebPubSubMessage {
  readonly type: UpstreamMessageType.SequenceAck;
  sequenceId: bigint;
}

export enum WebPubSubDataType {
  Binary = 1,
  Json = 2,
  Text = 3,
  Protobuf = 4,
}
