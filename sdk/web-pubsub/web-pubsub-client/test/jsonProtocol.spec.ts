import { assert } from "@azure/test-utils";
import { JoinGroupMessage, LeaveGroupMessage } from "../src/models";
import { WebPubSubJsonReliableProtocol } from "../src/protocols";


describe("JsonProtocol", function() {
  const protocol = WebPubSubJsonReliableProtocol(); 

  describe("WriteMessage upstream messages", () => {
    const tests = [
      {testName: "JoinGroup1", message: {kind: "joinGroup", group: "group"} as JoinGroupMessage, payload: {type: "joinGroup", group: "group"}},
      {testName: "JoinGroup2", message: {kind: "joinGroup", group: "group", ackId: 44133} as JoinGroupMessage, payload: {type: "joinGroup", group: "group", ackId: 44133}},
      {testName: "leaveGroup1", message: {kind: "leaveGroup", group: "group"} as LeaveGroupMessage, payload: {type: "leaveGroup", group: "group"}},
      {testName: "leaveGroup2", message: {kind: "leaveGroup", group: "group", ackId: 12345} as LeaveGroupMessage, payload: {type: "leaveGroup", group: "group", ackId: 12345}},
    ]

    tests.forEach(({testName, message, payload}) => {
      it(`write message test ${testName}`, () => {
        const serializedPayload = JSON.stringify(payload);
        const writeMessage = protocol.writeMessage(message) as string;
        assert.equal(serializedPayload, writeMessage);
      })
    });
  });
});