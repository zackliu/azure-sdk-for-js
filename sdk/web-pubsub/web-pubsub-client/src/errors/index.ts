import { AckMessage } from "../models/messages";

export class SendMessageError extends Error {
  name: string;
  ackMessage?: AckMessage

  constructor(message: string, ackMessage?: AckMessage) {
    super(message);
    this.name = "SendMessageError";
    this.ackMessage = ackMessage;
  }
}