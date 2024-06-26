/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */

import { DiscoverySolutionNLPTenantScope } from "../operationsInterfaces";
import * as coreClient from "@azure/core-client";
import * as Mappers from "../models/mappers";
import * as Parameters from "../models/parameters";
import { HelpRP } from "../helpRP";
import {
  DiscoverySolutionNLPTenantScopePostOptionalParams,
  DiscoverySolutionNLPTenantScopePostResponse,
} from "../models";

/** Class containing DiscoverySolutionNLPTenantScope operations. */
export class DiscoverySolutionNLPTenantScopeImpl
  implements DiscoverySolutionNLPTenantScope
{
  private readonly client: HelpRP;

  /**
   * Initialize a new instance of the class DiscoverySolutionNLPTenantScope class.
   * @param client Reference to the service client
   */
  constructor(client: HelpRP) {
    this.client = client;
  }

  /**
   * Search for relevant Azure Diagnostics, Solutions and Troubleshooters using a natural language issue
   * summary.
   * @param options The options parameters.
   */
  post(
    options?: DiscoverySolutionNLPTenantScopePostOptionalParams,
  ): Promise<DiscoverySolutionNLPTenantScopePostResponse> {
    return this.client.sendOperationRequest({ options }, postOperationSpec);
  }
}
// Operation Specifications
const serializer = coreClient.createSerializer(Mappers, /* isXml */ false);

const postOperationSpec: coreClient.OperationSpec = {
  path: "/providers/Microsoft.Help/discoverSolutions",
  httpMethod: "POST",
  responses: {
    200: {
      bodyMapper: Mappers.DiscoveryNlpResponse,
    },
    default: {
      bodyMapper: Mappers.ErrorResponse,
    },
  },
  requestBody: Parameters.discoverSolutionRequest,
  queryParameters: [Parameters.apiVersion],
  urlParameters: [Parameters.$host],
  headerParameters: [Parameters.accept, Parameters.contentType],
  mediaType: "json",
  serializer,
};
