// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { WebPubSubClientOptions } from "./models";
import { ConnectedMessage, DataMessage, DisconnectedMessage } from "./models/messages";
import { WebPubSubClientCredential } from "./webPubSubClientCredential";

export type OnMessage = (data: DataMessage) => Promise<void>;

export type OnConnected = (data: ConnectedMessage) => Promise<void>;

export type OnDisconnected = (data: DisconnectedMessage) => Promise<void>;

export class WebPubSubClient {

  private _onMessage?: OnMessage;
  private _onConnected?: OnConnected;
  private _onDisconnected?: OnDisconnected;

  constructor(clientAccessUri: string);
  constructor(credential: WebPubSubClientCredential)
  constructor(credential: string | WebPubSubClientCredential) {
  }

  public async connect() : Promise<void> {

  }

  public async stop() : Promise<void> {
  }

  public async sendToServer(): Promise<void> {

  }

  


}
