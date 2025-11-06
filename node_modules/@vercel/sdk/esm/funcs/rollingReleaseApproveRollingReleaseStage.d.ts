import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ApproveRollingReleaseStageRequest, ApproveRollingReleaseStageResponseBody } from "../models/approverollingreleasestageop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update the active rolling release to the next stage for a project
 *
 * @remarks
 * Advance a rollout to the next stage. This is only needed when rolling releases is configured to require manual approval.
 */
export declare function rollingReleaseApproveRollingReleaseStage(client: VercelCore, request: ApproveRollingReleaseStageRequest, options?: RequestOptions): APIPromise<Result<ApproveRollingReleaseStageResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=rollingReleaseApproveRollingReleaseStage.d.ts.map