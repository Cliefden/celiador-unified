import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DeleteAuthTokenRequest, DeleteAuthTokenResponseBody } from "../models/deleteauthtokenop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Delete an authentication token
 *
 * @remarks
 * Invalidate an authentication token, such that it will no longer be valid for future HTTP requests.
 */
export declare function authenticationDeleteAuthToken(client: VercelCore, request: DeleteAuthTokenRequest, options?: RequestOptions): APIPromise<Result<DeleteAuthTokenResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=authenticationDeleteAuthToken.d.ts.map