import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateCheckRequest, CreateCheckResponseBody } from "../models/createcheckop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Creates a new Check
 *
 * @remarks
 * Creates a new check. This endpoint must be called with an OAuth2 or it will produce a 400 error.
 */
export declare function checksCreateCheck(client: VercelCore, request: CreateCheckRequest, options?: RequestOptions): APIPromise<Result<CreateCheckResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=checksCreateCheck.d.ts.map