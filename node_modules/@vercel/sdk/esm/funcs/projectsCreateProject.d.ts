import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateProjectRequest, CreateProjectResponseBody } from "../models/createprojectop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create a new project
 *
 * @remarks
 * Allows to create a new project with the provided configuration. It only requires the project `name` but more configuration can be provided to override the defaults.
 */
export declare function projectsCreateProject(client: VercelCore, request: CreateProjectRequest, options?: RequestOptions): APIPromise<Result<CreateProjectResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectsCreateProject.d.ts.map