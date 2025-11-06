import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetTeamRequest } from "../models/getteamop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { Team } from "../models/team.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get a Team
 *
 * @remarks
 * Get information for the Team specified by the `teamId` parameter.
 */
export declare function teamsGetTeam(client: VercelCore, request: GetTeamRequest, options?: RequestOptions): APIPromise<Result<Team, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=teamsGetTeam.d.ts.map