import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetCheckRequest, GetCheckResponseBody } from "../models/getcheckop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get a single check
 *
 * @remarks
 * Return a detailed response for a single check.
 */
export declare function checksGetCheck(client: VercelCore, request: GetCheckRequest, options?: RequestOptions): APIPromise<Result<GetCheckResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=checksGetCheck.d.ts.map