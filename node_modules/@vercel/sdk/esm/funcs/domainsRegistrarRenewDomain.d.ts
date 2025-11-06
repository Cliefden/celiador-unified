import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DomainNotFound } from "../models/domainnotfound.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { InternalServerError } from "../models/internalservererror.js";
import { RenewDomainDomainsRegistrarResponseBody, RenewDomainDomainsRegistrarResponseResponseBody, RenewDomainRequest, RenewDomainResponseBody } from "../models/renewdomainop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { TooManyRequests } from "../models/toomanyrequests.js";
import { Unauthorized } from "../models/unauthorized.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Renew a domain
 *
 * @remarks
 * Renew a domain
 */
export declare function domainsRegistrarRenewDomain(client: VercelCore, request: RenewDomainRequest, options?: RequestOptions): APIPromise<Result<RenewDomainResponseBody, RenewDomainDomainsRegistrarResponseBody | Unauthorized | RenewDomainDomainsRegistrarResponseResponseBody | DomainNotFound | TooManyRequests | InternalServerError | VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=domainsRegistrarRenewDomain.d.ts.map