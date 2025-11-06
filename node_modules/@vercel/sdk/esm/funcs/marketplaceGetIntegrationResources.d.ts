import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetIntegrationResourcesRequest, GetIntegrationResourcesResponseBody } from "../models/getintegrationresourcesop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get Integration Resources
 *
 * @remarks
 * Get all resources for a given installation ID.
 */
export declare function marketplaceGetIntegrationResources(client: VercelCore, request: GetIntegrationResourcesRequest, options?: RequestOptions): APIPromise<Result<GetIntegrationResourcesResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=marketplaceGetIntegrationResources.d.ts.map