import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetTldPriceDomainsRegistrarResponseBody, GetTldPriceRequest, GetTldPriceResponseBody } from "../models/gettldpriceop.js";
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
 * Get TLD price data
 *
 * @remarks
 * Get price data for a specific TLD. This only reflects base prices for the given TLD. Premium domains may have different prices. Use the [Get price data for a domain](https://vercel.com/docs/rest-api/reference/endpoints/domains-registrar/get-price-data-for-a-domain) endpoint to get the price data for a specific domain.
 */
export declare function domainsRegistrarGetTldPrice(client: VercelCore, request: GetTldPriceRequest, options?: RequestOptions): APIPromise<Result<GetTldPriceResponseBody, GetTldPriceDomainsRegistrarResponseBody | Unauthorized | NotAuthorizedForScope | TooManyRequests | InternalServerError | VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=domainsRegistrarGetTldPrice.d.ts.map