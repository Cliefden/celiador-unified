import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { EditProjectEnvRequest, EditProjectEnvResponseBody } from "../models/editprojectenvop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Edit an environment variable
 *
 * @remarks
 * Edit a specific environment variable for a given project by passing the environment variable identifier and either passing the project `id` or `name` in the URL.
 */
export declare function projectsEditProjectEnv(client: VercelCore, request: EditProjectEnvRequest, options?: RequestOptions): APIPromise<Result<EditProjectEnvResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectsEditProjectEnv.d.ts.map