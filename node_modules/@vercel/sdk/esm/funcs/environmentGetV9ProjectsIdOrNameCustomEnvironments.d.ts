import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetV9ProjectsIdOrNameCustomEnvironmentsRequest, GetV9ProjectsIdOrNameCustomEnvironmentsResponseBody } from "../models/getv9projectsidornamecustomenvironmentsop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Retrieve custom environments
 *
 * @remarks
 * Retrieve custom environments for the project. Must not be named 'Production' or 'Preview'.
 */
export declare function environmentGetV9ProjectsIdOrNameCustomEnvironments(client: VercelCore, request: GetV9ProjectsIdOrNameCustomEnvironmentsRequest, options?: RequestOptions): APIPromise<Result<GetV9ProjectsIdOrNameCustomEnvironmentsResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=environmentGetV9ProjectsIdOrNameCustomEnvironments.d.ts.map