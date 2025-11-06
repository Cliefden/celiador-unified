import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetTeamMembersRequest, GetTeamMembersResponseBody } from "../models/getteammembersop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List team members
 *
 * @remarks
 * Get a paginated list of team members for the provided team.
 */
export declare function teamsGetTeamMembers(client: VercelCore, request: GetTeamMembersRequest, options?: RequestOptions): APIPromise<Result<GetTeamMembersResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=teamsGetTeamMembers.d.ts.map