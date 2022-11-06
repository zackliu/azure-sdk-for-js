import { assert } from "@azure/test-utils";
import { ReconnectionOptions, WebPubSubClientOptions } from "../src/models";
import { WebPubSubJsonProtocol } from "../src/protocols";
import { WebPubSubClient } from "../src/webPubSubClient";
import { DefaultWebPubSubClientCredential } from "../src/webPubSubClientCredential";

describe("JsonProtocol", function() {
  describe("WriteMessage upstream messages", () => {
    it("write joinGroup", () => {
      assert.doesNotThrow(() => {
        new WebPubSubClient("wss://service.com");
      });
    });

    it("write leaveGroup", () => {
      assert.doesNotThrow(() => {
        new WebPubSubClient("wss://service.com");
      });
    });

    it("write sendToGroup", () => {
      assert.doesNotThrow(() => {
        new WebPubSubClient("wss://service.com");
      });
    });

    it("write sendEvent", () => {
      assert.doesNotThrow(() => {
        new WebPubSubClient(new DefaultWebPubSubClientCredential(async _ => "wss://service.com"));
      });
    });

    it("write sequenceAck", () => {
      assert.doesNotThrow(() => {
        new WebPubSubClient(new DefaultWebPubSubClientCredential(async _ => "wss://service.com"), {protocol: WebPubSubJsonProtocol(), reconnectionOptions: {autoReconnect: false} as ReconnectionOptions} as WebPubSubClientOptions);
      });
    });

    it("protocol is missing ", () => {
      assert.doesNotThrow(() => {
        let client = new WebPubSubClient(new DefaultWebPubSubClientCredential(async _ => "wss://service.com"), {reconnectionOptions: {autoReconnect: false} as ReconnectionOptions} as WebPubSubClientOptions);
        let protocol = client['_protocol'];
        assert.equal('json.reliable.webpubsub.azure.v1', protocol.name);
        let options = client['_options'];
        assert.isFalse(options.reconnectionOptions.autoReconnect);
      });
    });

    it("reconnectionOptions is missing ", () => {
      assert.doesNotThrow(() => {
        let client = new WebPubSubClient(new DefaultWebPubSubClientCredential(async _ => "wss://service.com"), {} as WebPubSubClientOptions);
        let options = client['_options'];
        assert.isTrue(options.reconnectionOptions.autoReconnect);
      });
    });
  });
});