// Copyright (c) Microsoft Corporation.

import { WebPubSubMessage } from "../models/messages";

// Licensed under the MIT license.
export interface WebPubSubClientProtocol {
  name: string;

  isReliableSubProtocol: boolean;
  /** Creates an array of {@link @microsoft/signalr.HubMessage} objects from the specified serialized representation.
     *
     * If {@link @microsoft/signalr.IHubProtocol.transferFormat} is 'Text', the `input` parameter must be a string, otherwise it must be an ArrayBuffer.
     *
     * @param {string | ArrayBuffer} input A string or ArrayBuffer containing the serialized representation.
     * @param {ILogger} logger A logger that will be used to log messages that occur during parsing.
     */
  parseMessages(input: string | ArrayBuffer | Buffer): WebPubSubMessage;
   /** Writes the specified {@link @microsoft/signalr.HubMessage} to a string or ArrayBuffer and returns it.
    *
    * If {@link @microsoft/signalr.IHubProtocol.transferFormat} is 'Text', the result of this method will be a string, otherwise it will be an ArrayBuffer.
    *
    * @param {HubMessage} message The message to write.
    * @returns {string | ArrayBuffer} A string or ArrayBuffer containing the serialized representation of the message.
    */
  writeMessage(message: WebPubSubMessage): string | ArrayBuffer;
}