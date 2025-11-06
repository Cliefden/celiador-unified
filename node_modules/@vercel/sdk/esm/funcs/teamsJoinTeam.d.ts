import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { JoinTeamRequest, JoinTeamResponseBody } from "../models/jointeamop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Join a team
 *
 * @remarks
 * Join a team with a provided invite code or team ID.
 */
export declare function teamsJoinTeam(client: VercelCore, request: JoinTeamRequest, options?: RequestOptions): APIPromise<Result<JoinTeamResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=teamsJoinTeam.d.ts.map