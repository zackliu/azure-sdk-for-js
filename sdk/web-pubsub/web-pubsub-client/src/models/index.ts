// Copyright (c) Microsoft Corporation.

import { CloseEvent } from "ws";
import { WebPubSubClientProtocol } from "../protocols";
import { AckMessage, ConnectedMessage, DataMessage, DisconnectedMessage, GroupDataMessage } from "./messages";

// Licensed under the MIT license.
export interface WebPubSubClientOptions {
  protocol: WebPubSubClientProtocol;
  reconnectionOptions: ReconnectionOptions;  
}

export interface ReconnectionOptions {
  autoReconnect: boolean;
  autoRejoinGroups: boolean;
}

export interface SendToGroupOptions {
  noEcho: boolean;
  fireAndForget:boolean;
}

export interface SendToServerOptions {
  fireAndForget:boolean;
}

export interface OnConnectedArgs {
  message: ConnectedMessage; 
}

export interface OnDisconnectedArgs {
  message?: DisconnectedMessage;
  event?: CloseEvent;
}

export interface OnDataMessageArgs {
  message: DataMessage;
}

export interface OnGroupDataMessageArgs {
  message: GroupDataMessage;
}

export interface AckResult {
  ack: AckMessage;
}