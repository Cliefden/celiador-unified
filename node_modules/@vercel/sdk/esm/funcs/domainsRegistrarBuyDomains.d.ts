import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { BuyDomainsDomainsRegistrarResponseBody, BuyDomainsDomainsRegistrarResponseResponseBody, BuyDomainsRequest, BuyDomainsResponseBody } from "../models/buydomainsop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { InternalServerError } from "../models/internalservererror.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { TooManyRequests } from "../models/toomanyrequests.js";
import { Unauthorized } from "../models/unauthorized.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Buy multiple domains
 *
 * @remarks
 * Buy multiple domains at once
 */
export declare function domainsRegistrarBuyDomains(client: VercelCore, request: BuyDomainsRequest, options?: RequestOptions): APIPromise<Result<BuyDomainsResponseBody, BuyDomainsDomainsRegistrarResponseBody | Unauthorized | BuyDomainsDomainsRegistrarResponseResponseBody | TooManyRequests | InternalServerError | VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=domainsRegistrarBuyDomains.d.ts.map