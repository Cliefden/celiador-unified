import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { UpdateProjectDomainRequest, UpdateProjectDomainResponseBody } from "../models/updateprojectdomainop.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update a project domain
 *
 * @remarks
 * Update a project domain's configuration, including the name, git branch and redirect of the domain.
 */
export declare function projectsUpdateProjectDomain(client: VercelCore, request: UpdateProjectDomainRequest, options?: RequestOptions): APIPromise<Result<UpdateProjectDomainResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectsUpdateProjectDomain.d.ts.map