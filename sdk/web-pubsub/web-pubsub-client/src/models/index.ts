// Copyright (c) Microsoft Corporation.

import { WebPubSubClientProtocol } from "../protocols";

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