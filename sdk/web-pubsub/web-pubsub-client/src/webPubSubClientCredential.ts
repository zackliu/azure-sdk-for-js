import { WebPubSubClientCredentialOptions } from "./webPubSubClientCredentialOptions";
import { AbortSignalLike } from "@azure/abort-controller";

export type TokenProvider = (abortSignal?: AbortSignalLike) => Promise<string>

export interface WebPubSubClientCredential {

    /**
     * Gets an `AccessToken` for the user. Throws if already disposed.
     * @param abortSignal - An implementation of `AbortSignalLike` to cancel the operation.
     */
    getClientAccessUri(abortSignal?: AbortSignalLike): Promise<string>;
}

export class DefaultWebPubSubClientCredential implements WebPubSubClientCredential {
  private readonly _tokenProvider: TokenProvider;
  
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
    constructor(tokenProvider: TokenProvider);
    constructor(tokenProvider: string | TokenProvider) {
      if (typeof tokenProvider === "string") {
        this._tokenProvider = async _ => tokenProvider;
      } else {
        this._tokenProvider = tokenProvider;
      }
    }
  
    /**
     * Gets an `AccessToken` for the user. Throws if already disposed.
     * @param abortSignal - An implementation of `AbortSignalLike` to cancel the operation.
     */
    public async getClientAccessUri(abortSignal?: AbortSignalLike): Promise<string> {
      const token = await this._tokenProvider(abortSignal);
      return token;
    }
}