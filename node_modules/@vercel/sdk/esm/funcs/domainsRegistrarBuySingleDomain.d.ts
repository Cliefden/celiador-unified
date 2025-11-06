import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { BuySingleDomainDomainsRegistrarResponseBody, BuySingleDomainDomainsRegistrarResponseResponseBody, BuySingleDomainRequest, BuySingleDomainResponseBody } from "../models/buysingledomainop.js";
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
 * Buy a domain
 *
 * @remarks
 * Buy a domain
 */
export declare function domainsRegistrarBuySingleDomain(client: VercelCore, request: BuySingleDomainRequest, options?: RequestOptions): APIPromise<Result<BuySingleDomainResponseBody, BuySingleDomainDomainsRegistrarResponseBody | Unauthorized | BuySingleDomainDomainsRegistrarResponseResponseBody | TooManyRequests | InternalServerError | VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=domainsRegistrarBuySingleDomain.d.ts.map