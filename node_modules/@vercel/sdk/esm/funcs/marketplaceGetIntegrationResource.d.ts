import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetIntegrationResourceRequest, GetIntegrationResourceResponseBody } from "../models/getintegrationresourceop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get Integration Resource
 *
 * @remarks
 * Get a resource by its partner ID.
 */
export declare function marketplaceGetIntegrationResource(client: VercelCore, request: GetIntegrationResourceRequest, options?: RequestOptions): APIPromise<Result<GetIntegrationResourceResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=marketplaceGetIntegrationResource.d.ts.map