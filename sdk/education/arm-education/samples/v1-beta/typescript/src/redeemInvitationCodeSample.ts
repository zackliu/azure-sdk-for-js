/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { RedeemRequest, EducationManagementClient } from "@azure/arm-education";
import { DefaultAzureCredential } from "@azure/identity";

/**
 * This sample demonstrates how to Redeem invite code to join a redeemable lab
 *
 * @summary Redeem invite code to join a redeemable lab
 * x-ms-original-file: specification/education/resource-manager/Microsoft.Education/preview/2021-12-01-preview/examples/RedeemCode.json
 */
async function redeemCode() {
  const parameters: RedeemRequest = {
    firstName: "test",
    lastName: "user",
    redeemCode: "exampleRedeemCode"
  };
  const credential = new DefaultAzureCredential();
  const client = new EducationManagementClient(credential);
  const result = await client.redeemInvitationCode(parameters);
  console.log(result);
}

redeemCode().catch(console.error);
