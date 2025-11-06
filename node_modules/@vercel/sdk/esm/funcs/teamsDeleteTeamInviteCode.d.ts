import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DeleteTeamInviteCodeRequest, DeleteTeamInviteCodeResponseBody } from "../models/deleteteaminvitecodeop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Delete a Team invite code
 *
 * @remarks
 * Delete an active Team invite code.
 */
export declare function teamsDeleteTeamInviteCode(client: VercelCore, request: DeleteTeamInviteCodeRequest, options?: RequestOptions): APIPromise<Result<DeleteTeamInviteCodeResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=teamsDeleteTeamInviteCode.d.ts.map