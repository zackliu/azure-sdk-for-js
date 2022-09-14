// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AbortSignalLike } from "@azure/abort-controller";
import { WebPubSubClientOptions } from "./models";
import { ConnectedMessage, DataMessage, DisconnectedMessage, WebPubSubDataType } from "./models/messages";
import { WebPubSubClientCredential } from "./webPubSubClientCredential";
import { WebPubSubGroup } from "./webPubSubGroup";

export type OnMessage = (data: DataMessage) => Promise<void>;

export type OnConnected = (data: ConnectedMessage) => Promise<void>;

export type OnDisconnected = (data: DisconnectedMessage) => Promise<void>;

export class WebPubSubClient {
  private _connection;

  private _onMessage?: OnMessage;
  private _onConnected?: OnConnected;
  private _onDisconnected?: OnDisconnected;

  constructor(clientAccessUri: string, options?: WebPubSubClientOptions);
  constructor(credential: WebPubSubClientCredential, options?: WebPubSubClientOptions)
  constructor(credential: string | WebPubSubClientCredential, options?: WebPubSubClientOptions) {
  }

  public async connect(abortSignal?: AbortSignalLike) : Promise<void> {

  }

  public async stop(abortSignal?: AbortSignalLike) : Promise<void> {

  }

  public async sendToServer(eventName: string,
     content: string | ArrayBuffer,
     dataType: WebPubSubDataType,
     ackId?: bigint,
     abortSignal?: AbortSignalLike): Promise<void> {

  }

  public group(groupName: string): WebPubSubGroup{

  }

}
