import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { RemoveProjectMemberRequest, RemoveProjectMemberResponseBody } from "../models/removeprojectmemberop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Remove a Project Member
 *
 * @remarks
 * Remove a member from a specific project
 */
export declare function projectMembersRemoveProjectMember(client: VercelCore, request: RemoveProjectMemberRequest, options?: RequestOptions): APIPromise<Result<RemoveProjectMemberResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectMembersRemoveProjectMember.d.ts.map