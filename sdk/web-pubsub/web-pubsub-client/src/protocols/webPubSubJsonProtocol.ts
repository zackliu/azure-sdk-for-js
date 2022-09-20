import { WebPubSubClientProtocol } from ".";
import { AckMessage, ConnectedMessage, DisconnectedMessage, GroupDataMessage, ServerDataMessage, WebPubSubMessage } from "../models/messages";

export class WebPubSubJsonProtocol implements WebPubSubClientProtocol {
  public isReliableSubProtocol = false;
  public name = "json.webpubsub.azure.v1";

  parseMessages(input: string): WebPubSubMessage {
    // The interface does allow "ArrayBuffer" to be passed in, but this implementation does not. So let's throw a useful error.
    if (typeof input !== "string") {
      throw new Error("Invalid input for JSON hub protocol. Expected a string.");
    }

    if (!input) {
      throw new Error("No input");
    }

    const parsedMessage = JSON.parse(input);
    var typedMessage = parsedMessage as {type: string; from: string; event: string;};
    var returnMessage: WebPubSubMessage;

    if (typedMessage.type == "system") {
      if (typedMessage.event == "connected") {
        returnMessage = parsedMessage as ConnectedMessage;
      } else if (typedMessage.event == "disconnected") {
        returnMessage = parsedMessage as DisconnectedMessage;
      } else {
        throw new Error();
      }
    } else if (typedMessage.type == "message") {
      if (typedMessage.from == "group") {
        returnMessage = parsedMessage as GroupDataMessage;
      } else if (typedMessage.from == "server") {
        returnMessage = parsedMessage as ServerDataMessage;
      } else {
        throw new Error();
      }
    } else if (typedMessage.type == "ack") {
      returnMessage = parsedMessage as AckMessage;
    } else {
      throw new Error();
    }
    return returnMessage;
  }

  writeMessage(message: WebPubSubMessage): string {
    return JSON.stringify(message);
  }
}