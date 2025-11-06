import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateAccessGroupProjectRequest, CreateAccessGroupProjectResponseBody } from "../models/createaccessgroupprojectop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create an access group project
 *
 * @remarks
 * Allows creation of an access group project
 */
export declare function accessGroupsCreateAccessGroupProject(client: VercelCore, request: CreateAccessGroupProjectRequest, options?: RequestOptions): APIPromise<Result<CreateAccessGroupProjectResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=accessGroupsCreateAccessGroupProject.d.ts.map