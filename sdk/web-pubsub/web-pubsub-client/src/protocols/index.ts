// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { WebPubSubMessage } from "../models/messages";

export interface WebPubSubClientProtocol {
  /**
   * The name of subprotocol. Name will be used in websocket subprotocol
   */
  name: string;

  /**
   * True if the protocol supports reliable features
   */
  isReliableSubProtocol: boolean;
  
  /**
   * Creates WebPubSubMessage objects from the specified serialized representation.
   * @param input The serialized representation
   */
  parseMessages(input: string | ArrayBuffer | Buffer): WebPubSubMessage;

  /**
   * Write WebPubSubMessage to string or ArrayBuffer
   * @param message The message to be written
   */
  writeMessage(message: WebPubSubMessage): string | ArrayBuffer;
}

export * from "./webPubSubJsonProtocol"
export * from "./webPubSubJsonReliableProtocol"