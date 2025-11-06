import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CheckDomainStatusRequest, CheckDomainStatusResponseBody } from "../models/checkdomainstatusop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Check a Domain Availability (deprecated)
 *
 * @remarks
 * This endpoint is deprecated and replaced with the endpoint [Get availability for a domain](https://vercel.com/docs/rest-api/reference/endpoints/domains-registrar/get-availability-for-a-domain). Check if a domain name is available for purchase.
 */
export declare function domainsCheckDomainStatus(client: VercelCore, request: CheckDomainStatusRequest, options?: RequestOptions): APIPromise<Result<CheckDomainStatusResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=domainsCheckDomainStatus.d.ts.map