// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { WebPubSubMessage } from "../models/messages";
import { WebPubSubJsonProtocolImpl } from "./webPubSubJsonProtocol";

/**
 * The interface to be implemented for a web pubsub subprotocol
 */
export interface WebPubSubClientProtocol {
  /**
   * The name of subprotocol. Name will be used in websocket subprotocol
   */
  readonly name: string;

  /**
   * True if the protocol supports reliable features
   */
  readonly isReliableSubProtocol: boolean;
  
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

export const WebPubSubJsonProtocol = () : WebPubSubClientProtocol => {
  return new WebPubSubJsonProtocolImpl();
}

export const webPubSubJsonReliableProtocol = () : WebPubSubClientProtocol => {
  return new WebPubSubJsonProtocolImpl();
}
