import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetAuthUserResponseBody } from "../models/getauthuserop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get the User
 *
 * @remarks
 * Retrieves information related to the currently authenticated User.
 */
export declare function userGetAuthUser(client: VercelCore, options?: RequestOptions): APIPromise<Result<GetAuthUserResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=userGetAuthUser.d.ts.map