import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetCustomEnvironmentRequest, GetCustomEnvironmentResponseBody } from "../models/getcustomenvironmentop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Retrieve a custom environment
 *
 * @remarks
 * Retrieve a custom environment for the project. Must not be named 'Production' or 'Preview'.
 */
export declare function environmentGetCustomEnvironment(client: VercelCore, request: GetCustomEnvironmentRequest, options?: RequestOptions): APIPromise<Result<GetCustomEnvironmentResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=environmentGetCustomEnvironment.d.ts.map