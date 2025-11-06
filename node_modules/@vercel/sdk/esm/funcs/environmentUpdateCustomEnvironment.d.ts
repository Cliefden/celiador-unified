import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { UpdateCustomEnvironmentRequest, UpdateCustomEnvironmentResponseBody } from "../models/updatecustomenvironmentop.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update a custom environment
 *
 * @remarks
 * Update a custom environment for the project. Must not be named 'Production' or 'Preview'.
 */
export declare function environmentUpdateCustomEnvironment(client: VercelCore, request: UpdateCustomEnvironmentRequest, options?: RequestOptions): APIPromise<Result<UpdateCustomEnvironmentResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=environmentUpdateCustomEnvironment.d.ts.map