import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetProjectDomainRequest, GetProjectDomainResponseBody } from "../models/getprojectdomainop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get a project domain
 *
 * @remarks
 * Get project domain by project id/name and domain name.
 */
export declare function projectsGetProjectDomain(client: VercelCore, request: GetProjectDomainRequest, options?: RequestOptions): APIPromise<Result<GetProjectDomainResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectsGetProjectDomain.d.ts.map