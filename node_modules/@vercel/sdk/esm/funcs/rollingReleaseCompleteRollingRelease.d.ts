import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CompleteRollingReleaseRequest, CompleteRollingReleaseResponseBody } from "../models/completerollingreleaseop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Complete the rolling release for the project
 *
 * @remarks
 * Force-complete a Rolling Release. The canary deployment will begin serving 100% of the traffic.
 */
export declare function rollingReleaseCompleteRollingRelease(client: VercelCore, request: CompleteRollingReleaseRequest, options?: RequestOptions): APIPromise<Result<CompleteRollingReleaseResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=rollingReleaseCompleteRollingRelease.d.ts.map