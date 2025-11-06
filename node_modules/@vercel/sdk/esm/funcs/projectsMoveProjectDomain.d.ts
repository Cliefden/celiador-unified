import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { MoveProjectDomainRequest, MoveProjectDomainResponseBody } from "../models/moveprojectdomainop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Move a project domain
 *
 * @remarks
 * Move one project's domain to another project. Also allows the move of all redirects pointed to that domain in the same project.
 */
export declare function projectsMoveProjectDomain(client: VercelCore, request: MoveProjectDomainRequest, options?: RequestOptions): APIPromise<Result<MoveProjectDomainResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectsMoveProjectDomain.d.ts.map