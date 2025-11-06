import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateProjectEnvRequest, CreateProjectEnvResponseBody } from "../models/createprojectenvop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create one or more environment variables
 *
 * @remarks
 * Create one or more environment variables for a project by passing its `key`, `value`, `type` and `target` and by specifying the project by either passing the project `id` or `name` in the URL. If you include `upsert=true` as a query parameter, a new environment variable will not be created if it already exists but, the existing variable's value will be updated.
 */
export declare function projectsCreateProjectEnv(client: VercelCore, request: CreateProjectEnvRequest, options?: RequestOptions): APIPromise<Result<CreateProjectEnvResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectsCreateProjectEnv.d.ts.map