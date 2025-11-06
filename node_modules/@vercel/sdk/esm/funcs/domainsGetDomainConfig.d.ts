import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetDomainConfigRequest, GetDomainConfigResponseBody } from "../models/getdomainconfigop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get a Domain's configuration
 *
 * @remarks
 * Get a Domain's configuration.
 */
export declare function domainsGetDomainConfig(client: VercelCore, request: GetDomainConfigRequest, options?: RequestOptions): APIPromise<Result<GetDomainConfigResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=domainsGetDomainConfig.d.ts.map