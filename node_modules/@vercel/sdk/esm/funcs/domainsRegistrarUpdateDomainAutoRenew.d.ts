import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DomainNotFound } from "../models/domainnotfound.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { InternalServerError } from "../models/internalservererror.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { TooManyRequests } from "../models/toomanyrequests.js";
import { Unauthorized } from "../models/unauthorized.js";
import { UpdateDomainAutoRenewDomainsRegistrarResponseBody, UpdateDomainAutoRenewRequest, UpdateDomainAutoRenewResponseBody } from "../models/updatedomainautorenewop.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update auto-renew for a domain
 *
 * @remarks
 * Update the auto-renew setting for a domain
 */
export declare function domainsRegistrarUpdateDomainAutoRenew(client: VercelCore, request: UpdateDomainAutoRenewRequest, options?: RequestOptions): APIPromise<Result<void, UpdateDomainAutoRenewResponseBody | Unauthorized | UpdateDomainAutoRenewDomainsRegistrarResponseBody | DomainNotFound | TooManyRequests | InternalServerError | VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=domainsRegistrarUpdateDomainAutoRenew.d.ts.map