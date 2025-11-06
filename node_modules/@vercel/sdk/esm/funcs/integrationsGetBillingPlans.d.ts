import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetBillingPlansRequest, GetBillingPlansResponseBody } from "../models/getbillingplansop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List integration billing plans
 *
 * @remarks
 * Get a list of billing plans for an integration and product.
 */
export declare function integrationsGetBillingPlans(client: VercelCore, request: GetBillingPlansRequest, options?: RequestOptions): APIPromise<Result<GetBillingPlansResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=integrationsGetBillingPlans.d.ts.map