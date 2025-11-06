import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { UpdateProjectRequest, UpdateProjectResponseBody } from "../models/updateprojectop.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update an existing project
 *
 * @remarks
 * Update the fields of a project using either its `name` or `id`.
 */
export declare function projectsUpdateProject(client: VercelCore, request: UpdateProjectRequest, options?: RequestOptions): APIPromise<Result<UpdateProjectResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectsUpdateProject.d.ts.map