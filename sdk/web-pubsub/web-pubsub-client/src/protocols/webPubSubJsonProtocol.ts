import { WebPubSubClientProtocol } from ".";
import { WebPubSubMessage } from "../models/messages";
import * as base from "./jsonProtocolBase";

export class WebPubSubJsonProtocol implements WebPubSubClientProtocol {
  public isReliableSubProtocol = false;
  public name = "json.webpubsub.azure.v1";

  public parseMessages(input: string): WebPubSubMessage {
    return base.parseMessages(input);
  }

  public writeMessage(message: WebPubSubMessage): string {
    return base.writeMessage(message);
  }
}