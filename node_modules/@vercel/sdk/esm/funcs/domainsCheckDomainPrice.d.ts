import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CheckDomainPriceRequest, CheckDomainPriceResponseBody } from "../models/checkdomainpriceop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Check the price for a domain (deprecated)
 *
 * @remarks
 * This endpoint is deprecated and replaced with the endpoint [Get price data for a domain](https://vercel.com/docs/rest-api/reference/endpoints/domains-registrar/get-price-data-for-a-domain). Check the price to purchase a domain and how long a single purchase period is.
 */
export declare function domainsCheckDomainPrice(client: VercelCore, request: CheckDomainPriceRequest, options?: RequestOptions): APIPromise<Result<CheckDomainPriceResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=domainsCheckDomainPrice.d.ts.map