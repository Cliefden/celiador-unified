import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { VerifyProjectDomainRequest, VerifyProjectDomainResponseBody } from "../models/verifyprojectdomainop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Verify project domain
 *
 * @remarks
 * Attempts to verify a project domain with `verified = false` by checking the correctness of the project domain's `verification` challenge.
 */
export declare function projectsVerifyProjectDomain(client: VercelCore, request: VerifyProjectDomainRequest, options?: RequestOptions): APIPromise<Result<VerifyProjectDomainResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectsVerifyProjectDomain.d.ts.map