import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetDomainRequest, GetDomainResponseBody } from "../models/getdomainop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get Information for a Single Domain
 *
 * @remarks
 * Get information for a single domain in an account or team.
 */
export declare function domainsGetDomain(client: VercelCore, request: GetDomainRequest, options?: RequestOptions): APIPromise<Result<GetDomainResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=domainsGetDomain.d.ts.map