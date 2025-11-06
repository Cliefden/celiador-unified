import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetDomainsRequest, GetDomainsResponseBody } from "../models/getdomainsop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List all the domains
 *
 * @remarks
 * Retrieves a list of domains registered for the authenticated user or team. By default it returns the last 20 domains if no limit is provided.
 */
export declare function domainsGetDomains(client: VercelCore, request: GetDomainsRequest, options?: RequestOptions): APIPromise<Result<GetDomainsResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=domainsGetDomains.d.ts.map