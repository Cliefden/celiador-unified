import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { InternalServerError } from "../models/internalservererror.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { TooManyRequests } from "../models/toomanyrequests.js";
import { TransferInDomainDomainsRegistrarResponseBody, TransferInDomainDomainsRegistrarResponseResponseBody, TransferInDomainRequest, TransferInDomainResponseBody } from "../models/transferindomainop.js";
import { Unauthorized } from "../models/unauthorized.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Transfer-in a domain
 *
 * @remarks
 * Transfer a domain in from another registrar
 */
export declare function domainsRegistrarTransferInDomain(client: VercelCore, request: TransferInDomainRequest, options?: RequestOptions): APIPromise<Result<TransferInDomainResponseBody, TransferInDomainDomainsRegistrarResponseBody | Unauthorized | TransferInDomainDomainsRegistrarResponseResponseBody | TooManyRequests | InternalServerError | VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=domainsRegistrarTransferInDomain.d.ts.map