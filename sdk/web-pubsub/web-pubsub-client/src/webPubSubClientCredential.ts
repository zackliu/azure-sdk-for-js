import { WebPubSubClientCredentialOptions } from "./webPubSubClientCredentialOptions";
import { AbortSignalLike } from "@azure/abort-controller";


export class WebPubSubClientCredential {
    private readonly credentialOptions: WebPubSubClientCredentialOptions;
  
    /**
     * Creates an instance of CommunicationTokenCredential with a static token and no proactive refreshing.
     * @param token - A user access token issued by Communication Services.
     */
    constructor(token: string);
    /**
     * Creates an instance of CommunicationTokenCredential with a lambda to get a token and options
     * to configure proactive refreshing.
     * @param refreshOptions - Options to configure refresh and opt-in to proactive refreshing.
     */
    constructor(credentialOptions: WebPubSubClientCredentialOptions);
    constructor(credentialOptions: string | WebPubSubClientCredentialOptions) {
      if (typeof credentialOptions === "string") {
        this
        this.credentialOptions = new WebPubSubClientCredentialOptions(async (_) => credentialOptions);
      } else {
        this.credentialOptions = credentialOptions;
      }
    }
  
    /**
     * Gets an `AccessToken` for the user. Throws if already disposed.
     * @param abortSignal - An implementation of `AbortSignalLike` to cancel the operation.
     */
    public async getToken(abortSignal?: AbortSignalLike): Promise<string> {
      const token = await this.credentialOptions.clientAccessUriProvider(abortSignal);
      return token;
    }
}