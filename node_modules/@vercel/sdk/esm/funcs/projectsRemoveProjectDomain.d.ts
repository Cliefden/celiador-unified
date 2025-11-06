import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { RemoveProjectDomainRequest, RemoveProjectDomainResponseBody } from "../models/removeprojectdomainop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Remove a domain from a project
 *
 * @remarks
 * Remove a domain from a project by passing the domain name and by specifying the project by either passing the project `id` or `name` in the URL.
 */
export declare function projectsRemoveProjectDomain(client: VercelCore, request: RemoveProjectDomainRequest, options?: RequestOptions): APIPromise<Result<RemoveProjectDomainResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectsRemoveProjectDomain.d.ts.map