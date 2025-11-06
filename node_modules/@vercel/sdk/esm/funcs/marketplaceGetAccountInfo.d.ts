import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetAccountInfoRequest, GetAccountInfoResponseBody } from "../models/getaccountinfoop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get Account Information
 *
 * @remarks
 * Fetches the best account or user’s contact info
 */
export declare function marketplaceGetAccountInfo(client: VercelCore, request: GetAccountInfoRequest, options?: RequestOptions): APIPromise<Result<GetAccountInfoResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=marketplaceGetAccountInfo.d.ts.map