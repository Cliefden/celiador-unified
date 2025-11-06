import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DeleteDomainRequest, DeleteDomainResponseBody } from "../models/deletedomainop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Remove a domain by name
 *
 * @remarks
 * Delete a previously registered domain name from Vercel. Deleting a domain will automatically remove any associated aliases.
 */
export declare function domainsDeleteDomain(client: VercelCore, request: DeleteDomainRequest, options?: RequestOptions): APIPromise<Result<DeleteDomainResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=domainsDeleteDomain.d.ts.map