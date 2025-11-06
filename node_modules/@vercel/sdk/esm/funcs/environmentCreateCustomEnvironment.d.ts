import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateCustomEnvironmentRequest, CreateCustomEnvironmentResponseBody } from "../models/createcustomenvironmentop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create a custom environment for the current project.
 *
 * @remarks
 * Creates a custom environment for the current project. Cannot be named 'Production' or 'Preview'.
 */
export declare function environmentCreateCustomEnvironment(client: VercelCore, request: CreateCustomEnvironmentRequest, options?: RequestOptions): APIPromise<Result<CreateCustomEnvironmentResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=environmentCreateCustomEnvironment.d.ts.map