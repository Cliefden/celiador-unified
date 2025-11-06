import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { RemoveProjectEnvRequest, RemoveProjectEnvResponseBody } from "../models/removeprojectenvop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Remove an environment variable
 *
 * @remarks
 * Delete a specific environment variable for a given project by passing the environment variable identifier and either passing the project `id` or `name` in the URL.
 */
export declare function projectsRemoveProjectEnv(client: VercelCore, request: RemoveProjectEnvRequest, options?: RequestOptions): APIPromise<Result<RemoveProjectEnvResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectsRemoveProjectEnv.d.ts.map