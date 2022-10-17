// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ErrorDetail } from "../models/messages";

/**
 * Error when sending message failed
 */
export class SendMessageError extends Error {
  /**
   * Error name
   */
  public name: string;
  /**
   * The ack id of the message
   */
  public ackId?: number;
  /**
   * The error details from the service
   */
  public errorDetail?: ErrorDetail
  /**
   * Initialize a SendMessageError
   * @param message The error message
   * @param ackMessage The ack message
   */
  public constructor(message: string, ackId?: number, errorDetail?: ErrorDetail) {
    super(message);
    this.name = "SendMessageError";
    this.ackId = ackId;
    this.errorDetail = errorDetail;
  }
}