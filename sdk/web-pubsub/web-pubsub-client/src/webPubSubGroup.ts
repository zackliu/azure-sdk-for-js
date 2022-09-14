import { AbortSignalLike } from "@azure/abort-controller";
import { GroupDataMessage, WebPubSubDataType } from "./models/messages";
import { WebPubSubClient } from "./webPubSubClient";

export type OnMessageReceived = (data: GroupDataMessage) => Promise<void>;

export class WebPubSubGroup {
  Name: string;
  constructor(client: WebPubSubClient, name: string) {
    this.Name = name;
  }

  public async join(ackId?: bigint, abortSignal?: AbortSignalLike): Promise<void> {

  }

  public async leave(ackId?: bigint, abortSignal?: AbortSignalLike): Promise<void> {

  }

  public async send(content: string | ArrayBuffer,
    dataType: WebPubSubDataType,
    ackId?: bigint,
    abortSignal?: AbortSignalLike): Promise<void> {

  }
}