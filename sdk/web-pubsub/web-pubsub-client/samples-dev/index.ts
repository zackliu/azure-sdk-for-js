import {WebPubSubClient, DefaultWebPubSubClientCredential, WebPubSubDataType} from "@azure/web-pubsub-client"
import { WebPubSubServiceClient } from "@azure/web-pubsub";

const serviceClient = new WebPubSubServiceClient(process.env.WPS_CONNECTION_STRING!, "chat");

async function main() {
  let client = new WebPubSubClient(new DefaultWebPubSubClientCredential(async _ => {
    return (await serviceClient.getClientAccessToken({roles: ["webpubsub.joinLeaveGroup", "webpubsub.sendToGroup"]})).url;
  }));

  client.onConnected = async e => {
    console.log(`Connection ${e.message.connectionId} is connected.`);
  }

  client.onMessage = async e => {
    console.log(`Received message ${e.message.data}`);
  }

  client.onDisconnected = async e => {
    console.log(`Connection disconnected: ${e.message}`);
  }

  await client.connect();

  await client.joinGroup("testGroup");
  await client.sendToGroup("testGroup", "hello world", WebPubSubDataType.Text);
  await delay(100000);
}

main().catch((e) => {
  console.error("Sample encountered an error", e);
  process.exit(1);
});

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}