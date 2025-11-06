import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { UpdateAttackChallengeModeRequest, UpdateAttackChallengeModeResponseBody } from "../models/updateattackchallengemodeop.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update Attack Challenge mode
 *
 * @remarks
 * Update the setting for determining if the project has Attack Challenge mode enabled.
 */
export declare function securityUpdateAttackChallengeMode(client: VercelCore, request: UpdateAttackChallengeModeRequest, options?: RequestOptions): APIPromise<Result<UpdateAttackChallengeModeResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=securityUpdateAttackChallengeMode.d.ts.map