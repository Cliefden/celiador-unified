import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetRollingReleaseBillingStatusRequest, GetRollingReleaseBillingStatusResponseBody } from "../models/getrollingreleasebillingstatusop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get rolling release billing status
 *
 * @remarks
 * Get the Rolling Releases billing status for a project. The team level billing status is used to determine if the project can be configured for rolling releases.
 */
export declare function rollingReleaseGetRollingReleaseBillingStatus(client: VercelCore, request: GetRollingReleaseBillingStatusRequest, options?: RequestOptions): APIPromise<Result<GetRollingReleaseBillingStatusResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=rollingReleaseGetRollingReleaseBillingStatus.d.ts.map