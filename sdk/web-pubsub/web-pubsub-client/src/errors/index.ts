// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AckMessage } from "../models/messages";

/**
 * Error when sending message failed
 */
export class SendMessageError extends Error {
  /**
   * Error name
   */
  public name: string;
  /**
   * The AckMessage from the service
   */
  public ackMessage?: AckMessage
  /**
   * Initialize a SendMessageError
   * @param message The error message
   * @param ackMessage The ack message
   */
  public constructor(message: string, ackMessage?: AckMessage) {
    super(message);
    this.name = "SendMessageError";
    this.ackMessage = ackMessage;
  }
}