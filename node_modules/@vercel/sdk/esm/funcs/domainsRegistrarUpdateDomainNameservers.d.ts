import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DomainNotFound } from "../models/domainnotfound.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { InternalServerError } from "../models/internalservererror.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { TooManyRequests } from "../models/toomanyrequests.js";
import { Unauthorized } from "../models/unauthorized.js";
import { UpdateDomainNameserversDomainsRegistrarResponseBody, UpdateDomainNameserversRequest, UpdateDomainNameserversResponseBody } from "../models/updatedomainnameserversop.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update nameservers for a domain
 *
 * @remarks
 * Update the nameservers for a domain. Pass an empty array to use Vercel's default nameservers.
 */
export declare function domainsRegistrarUpdateDomainNameservers(client: VercelCore, request: UpdateDomainNameserversRequest, options?: RequestOptions): APIPromise<Result<void, UpdateDomainNameserversResponseBody | Unauthorized | UpdateDomainNameserversDomainsRegistrarResponseBody | DomainNotFound | TooManyRequests | InternalServerError | VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=domainsRegistrarUpdateDomainNameservers.d.ts.map