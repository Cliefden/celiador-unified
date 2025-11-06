import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { RemoveTeamMemberRequest, RemoveTeamMemberResponseBody } from "../models/removeteammemberop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Remove a Team Member
 *
 * @remarks
 * Remove a Team Member from the Team, or dismiss a user that requested access, or leave a team.
 */
export declare function teamsRemoveTeamMember(client: VercelCore, request: RemoveTeamMemberRequest, options?: RequestOptions): APIPromise<Result<RemoveTeamMemberResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=teamsRemoveTeamMember.d.ts.map