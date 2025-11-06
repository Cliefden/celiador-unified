import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { UpdateCheckRequest, UpdateCheckResponseBody } from "../models/updatecheckop.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update a check
 *
 * @remarks
 * Update an existing check. This endpoint must be called with an OAuth2 or it will produce a 400 error.
 */
export declare function checksUpdateCheck(client: VercelCore, request: UpdateCheckRequest, options?: RequestOptions): APIPromise<Result<UpdateCheckResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=checksUpdateCheck.d.ts.map