import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateAuthTokenRequest, CreateAuthTokenResponseBody } from "../models/createauthtokenop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create an Auth Token
 *
 * @remarks
 * Creates and returns a new authentication token for the currently authenticated User. The `bearerToken` property is only provided once, in the response body, so be sure to save it on the client for use with API requests.
 */
export declare function authenticationCreateAuthToken(client: VercelCore, request: CreateAuthTokenRequest, options?: RequestOptions): APIPromise<Result<CreateAuthTokenResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=authenticationCreateAuthToken.d.ts.map