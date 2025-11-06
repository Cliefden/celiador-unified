import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetRollingReleaseRequest, GetRollingReleaseResponseBody } from "../models/getrollingreleaseop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get the active rolling release information for a project
 *
 * @remarks
 * Return the Rolling Release for a project, regardless of whether the rollout is active, aborted, or completed. If the feature is enabled but no deployment has occurred yet, null will be returned.
 */
export declare function rollingReleaseGetRollingRelease(client: VercelCore, request: GetRollingReleaseRequest, options?: RequestOptions): APIPromise<Result<GetRollingReleaseResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=rollingReleaseGetRollingRelease.d.ts.map