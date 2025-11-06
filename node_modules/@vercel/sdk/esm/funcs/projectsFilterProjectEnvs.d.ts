import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { FilterProjectEnvsRequest, FilterProjectEnvsResponseBody } from "../models/filterprojectenvsop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Retrieve the environment variables of a project by id or name
 *
 * @remarks
 * Retrieve the environment variables for a given project by passing either the project `id` or `name` in the URL.
 */
export declare function projectsFilterProjectEnvs(client: VercelCore, request: FilterProjectEnvsRequest, options?: RequestOptions): APIPromise<Result<FilterProjectEnvsResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectsFilterProjectEnvs.d.ts.map