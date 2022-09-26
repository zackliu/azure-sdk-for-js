import { WebPubSubClientProtocol } from ".";
import { WebPubSubMessage } from "../models/messages";
import * as base from "./jsonProtocolBase";

export class WebPubSubJsonReliableProtocol implements WebPubSubClientProtocol {
  public isReliableSubProtocol = true;
  public name = "json.reliable.webpubsub.azure.v1";

  public parseMessages(input: string): WebPubSubMessage {
    return base.parseMessages(input);
  }

  public writeMessage(message: WebPubSubMessage): string {
    return base.writeMessage(message);
  }
}