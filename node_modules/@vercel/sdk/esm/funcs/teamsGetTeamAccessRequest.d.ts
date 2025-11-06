import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetTeamAccessRequestRequest, GetTeamAccessRequestResponseBody } from "../models/getteamaccessrequestop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get access request status
 *
 * @remarks
 * Check the status of a join request. It'll respond with a 404 if the request has been declined. If no `userId` path segment was provided, this endpoint will instead return the status of the authenticated user.
 */
export declare function teamsGetTeamAccessRequest(client: VercelCore, request: GetTeamAccessRequestRequest, options?: RequestOptions): APIPromise<Result<GetTeamAccessRequestResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=teamsGetTeamAccessRequest.d.ts.map