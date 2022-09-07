import { AbortSignalLike } from "@azure/abort-controller";

export class WebPubSubClientCredentialOptions {
    clientAccessUriProvider: (abortSignal?: AbortSignalLike) => Promise<string>

    constructor(uriProvider: (abortSignal?: AbortSignalLike) => Promise<string>) {
        this.clientAccessUriProvider = uriProvider;
    }
}