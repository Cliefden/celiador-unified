import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetOrderDomainsRegistrarResponseBody, GetOrderRequest, GetOrderResponseBody } from "../models/getorderop.js";
import { HttpApiDecodeError } from "../models/httpapidecodeerror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { InternalServerError } from "../models/internalservererror.js";
import { NotFound } from "../models/notfound.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { TooManyRequests } from "../models/toomanyrequests.js";
import { Unauthorized } from "../models/unauthorized.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get a domain order
 *
 * @remarks
 * Get information about a domain order by its ID
 */
export declare function domainsRegistrarGetOrder(client: VercelCore, request: GetOrderRequest, options?: RequestOptions): APIPromise<Result<GetOrderResponseBody, HttpApiDecodeError | Unauthorized | GetOrderDomainsRegistrarResponseBody | NotFound | TooManyRequests | InternalServerError | VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=domainsRegistrarGetOrder.d.ts.map