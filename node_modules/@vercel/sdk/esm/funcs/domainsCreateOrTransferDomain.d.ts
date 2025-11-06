import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateOrTransferDomainRequest, CreateOrTransferDomainResponseBody } from "../models/createortransferdomainop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Add an existing domain to the Vercel platform
 *
 * @remarks
 * This endpoint is used for adding a new apex domain name with Vercel for the authenticating user. Note: This endpoint is no longer used for initiating domain transfers from external registrars to Vercel. For this, please use the endpoint [Transfer-in a domain](https://vercel.com/docs/rest-api/reference/endpoints/domains-registrar/transfer-in-a-domain).
 */
export declare function domainsCreateOrTransferDomain(client: VercelCore, request: CreateOrTransferDomainRequest, options?: RequestOptions): APIPromise<Result<CreateOrTransferDomainResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=domainsCreateOrTransferDomain.d.ts.map