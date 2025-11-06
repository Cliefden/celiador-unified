import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetDomainTransferRequest, GetDomainTransferResponseBody } from "../models/getdomaintransferop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get domain transfer info (deprecated)
 *
 * @remarks
 * This endpoint is deprecated and replaced with the endpoint [Get a domain's transfer status](https://vercel.com/docs/rest-api/reference/endpoints/domains-registrar/get-a-domains-transfer-status). Fetch domain transfer availability or transfer status if a transfer is in progress.
 */
export declare function domainsGetDomainTransfer(client: VercelCore, request: GetDomainTransferRequest, options?: RequestOptions): APIPromise<Result<GetDomainTransferResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=domainsGetDomainTransfer.d.ts.map