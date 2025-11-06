import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetDomainPriceDomainsRegistrarResponseBody, GetDomainPriceRequest, GetDomainPriceResponseBody } from "../models/getdomainpriceop.js";
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
 * Get price data for a domain
 *
 * @remarks
 * Get price data for a specific domain
 */
export declare function domainsRegistrarGetDomainPrice(client: VercelCore, request: GetDomainPriceRequest, options?: RequestOptions): APIPromise<Result<GetDomainPriceResponseBody, GetDomainPriceDomainsRegistrarResponseBody | Unauthorized | NotAuthorizedForScope | TooManyRequests | InternalServerError | VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=domainsRegistrarGetDomainPrice.d.ts.map