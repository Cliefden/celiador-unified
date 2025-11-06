import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { PatchTeamRequest } from "../models/patchteamop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { Team } from "../models/team.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update a Team
 *
 * @remarks
 * Update the information of a Team specified by the `teamId` parameter. The request body should contain the information that will be updated on the Team.
 */
export declare function teamsPatchTeam(client: VercelCore, request: PatchTeamRequest, options?: RequestOptions): APIPromise<Result<Team, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=teamsPatchTeam.d.ts.map