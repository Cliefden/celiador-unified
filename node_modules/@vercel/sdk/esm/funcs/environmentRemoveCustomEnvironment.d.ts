import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { RemoveCustomEnvironmentRequest, RemoveCustomEnvironmentResponseBody } from "../models/removecustomenvironmentop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Remove a custom environment
 *
 * @remarks
 * Remove a custom environment for the project. Must not be named 'Production' or 'Preview'.
 */
export declare function environmentRemoveCustomEnvironment(client: VercelCore, request: RemoveCustomEnvironmentRequest, options?: RequestOptions): APIPromise<Result<RemoveCustomEnvironmentResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=environmentRemoveCustomEnvironment.d.ts.map