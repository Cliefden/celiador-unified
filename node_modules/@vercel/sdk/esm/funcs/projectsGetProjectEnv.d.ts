import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetProjectEnvRequest, GetProjectEnvResponseBody } from "../models/getprojectenvop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Retrieve the decrypted value of an environment variable of a project by id
 *
 * @remarks
 * Retrieve the environment variable for a given project.
 */
export declare function projectsGetProjectEnv(client: VercelCore, request: GetProjectEnvRequest, options?: RequestOptions): APIPromise<Result<GetProjectEnvResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectsGetProjectEnv.d.ts.map