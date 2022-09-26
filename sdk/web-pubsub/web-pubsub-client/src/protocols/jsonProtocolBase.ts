import { AckMessage, ConnectedMessage, DisconnectedMessage, DownstreamMessageType, GroupDataMessage, JoinGroupMessage, LeaveGroupMessage, SendEventMessage, SendToGroupMessage, SequenceAckMessage, ServerDataMessage, UpstreamMessageType, WebPubSubDataType, WebPubSubMessage } from "../models/messages";
import { JSONTypes } from "../webPubSubClient";

export function parseMessages(input: string): WebPubSubMessage {
  // The interface does allow "ArrayBuffer" to be passed in, but this implementation does not. So let's throw a useful error.
  if (typeof input !== "string") {
    throw new Error("Invalid input for JSON hub protocol. Expected a string.");
  }

  if (!input) {
    throw new Error("No input");
  }

  const parsedMessage = JSON.parse(input);
  var typedMessage = parsedMessage as {type: string; from: string; event: string;};
  var returnMessage: WebPubSubMessage;

  if (typedMessage.type == "system") {
    if (typedMessage.event == "connected") {
      returnMessage = {...parsedMessage, _type: DownstreamMessageType.Connected} as ConnectedMessage;
    } else if (typedMessage.event == "disconnected") {
      returnMessage = {...parsedMessage, _type:DownstreamMessageType.Disconnected} as DisconnectedMessage;
    } else {
      throw new Error();
    }
  } else if (typedMessage.type == "message") {
    if (typedMessage.from == "group") {
      let data = parsePayload(parsedMessage.data, parsedMessage.dataType as WebPubSubDataType);
      returnMessage = {...parsedMessage, data: data, _type:DownstreamMessageType.GroupData
      } as GroupDataMessage;
    } else if (typedMessage.from == "server") {
      let data = parsePayload(parsedMessage.data, parsedMessage.dataType as WebPubSubDataType);
      returnMessage = {
        ...parsedMessage, data: data, _type:DownstreamMessageType.ServerData
      } as ServerDataMessage;
    } else {
      throw new Error();
    }
  } else if (typedMessage.type == "ack") {
    returnMessage = {...parsedMessage, _type:DownstreamMessageType.Ack} as AckMessage;
  } else {
    throw new Error();
  }
  return returnMessage;
}

export function writeMessage(message: WebPubSubMessage): string {
  let data: any;
  switch (message._type) {
    case UpstreamMessageType.JoinGroup: {
      data = new JoinGroupData(message as JoinGroupMessage);
      break;
    }
    case UpstreamMessageType.LeaveGroup: {
      data = new LeaveGroupData(message as LeaveGroupMessage);
      break;
    }
    case UpstreamMessageType.SendEvent: {
      data = new SendEventData(message as SendEventMessage);
      break;
    }
    case UpstreamMessageType.SendToGroup: {
      data = new SendToGroupData(message as SendToGroupMessage);
      break;
    }
    case UpstreamMessageType.SequenceAck: {
      data = new SequenceAckData(message as SequenceAckMessage);
      break;
    }
    default: {
      throw new Error(`Unsupported type: ${message._type}`);
    }
  }

  return JSON.stringify(data);
}

class JoinGroupData {
  type = "joinGroup";
  group: string;
  ackId?: number;

  constructor(message: JoinGroupMessage) {
    this.group = message.group;
    this.ackId = message.ackId;
  }
}

class LeaveGroupData {
  type = "leaveGroup";
  group: string;
  ackId?: number;

  constructor(message: LeaveGroupMessage) {
    this.group = message.group;
    this.ackId = message.ackId;
  }
}

class SendToGroupData {
  type = "sendToGroup";
  group: string;
  ackId?: number;
  dataType: WebPubSubDataType;
  data: any;
  noEcho: boolean;

  constructor(message: SendToGroupMessage) {
    this.group = message.group;
    this.ackId = message.ackId;
    this.dataType = message.dataType;
    this.data = getPayload(message.data, message.dataType);
    this.noEcho = message.noEcho
  }
}

class SendEventData {
  type = "event";
  ackId?: number;
  dataType: WebPubSubDataType;
  data: any;
  event: string;

  constructor(message: SendEventMessage) {
    this.ackId = message.ackId;
    this.dataType = message.dataType;
    this.data = getPayload(message.data, message.dataType);
    this.event = message.event;
  }
}

class SequenceAckData {
  type = "sequenceAck";
  sequenceId: number;

  constructor(message: SequenceAckMessage) {
    this.sequenceId = message.sequenceId;
  }
}

function getPayload(data: JSONTypes | ArrayBuffer, dataType: WebPubSubDataType): any {
  switch(dataType) {
    case WebPubSubDataType.Text: {
      if (typeof data !== "string") {
        throw new TypeError("Message must be a string.");
      }
      return data
    }
    case WebPubSubDataType.Json: {
      return JSON.stringify(data)
    }
    case WebPubSubDataType.Binary:
    case WebPubSubDataType.Protobuf: {
      if (data instanceof ArrayBuffer) {
        return Buffer.from(data).toString('base64')
      }
      throw new TypeError("Message must be a ArrayBuffer");
    }
  }
}

function parsePayload(data: any, dataType: string): JSONTypes | ArrayBuffer {
  if (dataType == "text") {
    if (typeof data !== "string") {
      throw new TypeError("Message must be a string when dataType is text");
    }
    return data as string;
  } else if (dataType == "json") {
    return data as JSONTypes;
  } else if (dataType == "binary" || dataType == "protobuf") {
    let buf = Buffer.from(data as string, 'base64');
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  } else {
    throw new TypeError(`Unsupported dataType: ${dataType}`);
  }
}