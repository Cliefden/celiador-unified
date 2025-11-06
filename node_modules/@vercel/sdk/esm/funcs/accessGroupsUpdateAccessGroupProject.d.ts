import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { UpdateAccessGroupProjectRequest, UpdateAccessGroupProjectResponseBody } from "../models/updateaccessgroupprojectop.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update an access group project
 *
 * @remarks
 * Allows update of an access group project
 */
export declare function accessGroupsUpdateAccessGroupProject(client: VercelCore, request: UpdateAccessGroupProjectRequest, options?: RequestOptions): APIPromise<Result<UpdateAccessGroupProjectResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=accessGroupsUpdateAccessGroupProject.d.ts.map