import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateTeamRequestBody, CreateTeamResponseBody } from "../models/createteamop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create a Team
 *
 * @remarks
 * Create a new Team under your account. You need to send a POST request with the desired Team slug, and optionally the Team name.
 */
export declare function teamsCreateTeam(client: VercelCore, request: CreateTeamRequestBody, options?: RequestOptions): APIPromise<Result<CreateTeamResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=teamsCreateTeam.d.ts.map