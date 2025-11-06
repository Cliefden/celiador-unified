import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetSupportedTldsRequest } from "../models/getsupportedtldsop.js";
import { HttpApiDecodeError } from "../models/httpapidecodeerror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { InternalServerError } from "../models/internalservererror.js";
import { NotAuthorizedForScope } from "../models/notauthorizedforscope.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { TooManyRequests } from "../models/toomanyrequests.js";
import { Unauthorized } from "../models/unauthorized.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get supported TLDs
 *
 * @remarks
 * Get a list of TLDs supported by Vercel
 */
export declare function domainsRegistrarGetSupportedTlds(client: VercelCore, request: GetSupportedTldsRequest, options?: RequestOptions): APIPromise<Result<Array<string>, HttpApiDecodeError | Unauthorized | NotAuthorizedForScope | TooManyRequests | InternalServerError | VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=domainsRegistrarGetSupportedTlds.d.ts.map