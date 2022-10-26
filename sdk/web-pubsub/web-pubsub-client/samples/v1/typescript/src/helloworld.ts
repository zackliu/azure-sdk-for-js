import {WebPubSubClient, DefaultWebPubSubClientCredential, WebPubSubDataType, SendToGroupOptions} from "@azure/web-pubsub-client"
import { WebPubSubServiceClient } from "@azure/web-pubsub";

const serviceClient = new WebPubSubServiceClient(process.env.WPS_CONNECTION_STRING!, "chat");

async function main() {
  let fetchClientAccessUrl = async() => {
    return (await serviceClient.getClientAccessToken({roles: ["webpubsub.joinLeaveGroup", "webpubsub.sendToGroup"]})).url
  }

  let client = new WebPubSubClient(new DefaultWebPubSubClientCredential(async _ => {
    return await fetchClientAccessUrl();
  }));

  client.on("connected", e => {
    console.log(`Connection ${e.message.connectionId} is connected.`);
  });

  client.on("disconnected", e => {
    console.log(`Connection disconnected: ${e.message}`);
  });

  client.on("server-message", e => {
    if (e.message.data instanceof ArrayBuffer) {
      console.log(`Received message ${Buffer.from(e.message.data).toString('base64')}`);
    } else {
      console.log(`Received message ${e.message.data}`);  
    }
  });

  client.on("group-message", e => {
    if (e.message.data instanceof ArrayBuffer) {
      console.log(`Received message from testGroup ${Buffer.from(e.message.data).toString('base64')}`);
    } else {
      console.log(`Received message from testGroup ${e.message.data}`);  
    }
  });

  await client.start();

  await client.joinGroup("testGroup");
  await client.sendToGroup("testGroup", "hello world", WebPubSubDataType.Text, undefined, {fireAndForget: true} as SendToGroupOptions);
  console.log("Sent message");
}

main().catch((e) => {
  console.error("Sample encountered an error", e);
  process.exit(1);
});