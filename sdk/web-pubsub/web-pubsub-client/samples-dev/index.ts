import {WebPubSubClient, DefaultWebPubSubClientCredential, WebPubSubDataType, SendToGroupOptions} from "@azure/web-pubsub-client"
import { WebPubSubServiceClient } from "@azure/web-pubsub";

const serviceClient = new WebPubSubServiceClient(process.env.WPS_CONNECTION_STRING!, "chat");

async function main() {
  let client = new WebPubSubClient(new DefaultWebPubSubClientCredential(async _ => {
    return (await serviceClient.getClientAccessToken({roles: ["webpubsub.joinLeaveGroup", "webpubsub.sendToGroup"]})).url;
  }));

  client.onConnected = async e => {
    console.log(`Connection ${e.message.connectionId} is connected.`);
  }

  client.onServerMessage = async e => {
    if (e.message.data instanceof ArrayBuffer) {
      console.log(`Received message ${Buffer.from(e.message.data).toString('base64')}`);
    } else {
      console.log(`Received message ${e.message.data}`);  
    }
  }
  client.onGroupMessage("testGroup", async e => {
    if (e.message.data instanceof ArrayBuffer) {
      console.log(`Received message from testGroup ${Buffer.from(e.message.data).toString('base64')}`);
    } else {
      console.log(`Received message from testGroup ${e.message.data}`);  
    }
  })

  client.onDisconnected = async e => {
    console.log(`Connection disconnected: ${e.message}`);
  }

  await client.start();

  await client.joinGroup("testGroup");
  await client.sendToGroup("testGroup", "hello world", WebPubSubDataType.Text, undefined, {fireAndForget: true} as SendToGroupOptions);
  await client.sendToGroup("testGroup", {a: 12, b: "hello"}, WebPubSubDataType.Json);
  await client.sendToGroup("testGroup", "hello json", WebPubSubDataType.Json);
  var buf = Buffer.from('aGVsbG9w', 'base64');
  await client.sendToGroup("testGroup", buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), WebPubSubDataType.Binary);
  console.log("Sent message");
  await delay(100000);
}

main().catch((e) => {
  console.error("Sample encountered an error", e);
  process.exit(1);
});

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}