import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { AddProjectMemberRequest, AddProjectMemberResponseBody } from "../models/addprojectmemberop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Adds a new member to a project.
 *
 * @remarks
 * Adds a new member to the project.
 */
export declare function projectMembersAddProjectMember(client: VercelCore, request: AddProjectMemberRequest, options?: RequestOptions): APIPromise<Result<AddProjectMemberResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectMembersAddProjectMember.d.ts.map