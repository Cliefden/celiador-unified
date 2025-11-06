import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetProjectDomainsRequest, GetProjectDomainsResponseBody } from "../models/getprojectdomainsop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Retrieve project domains by project by id or name
 *
 * @remarks
 * Retrieve the domains associated with a given project by passing either the project `id` or `name` in the URL.
 */
export declare function projectsGetProjectDomains(client: VercelCore, request: GetProjectDomainsRequest, options?: RequestOptions): APIPromise<Result<GetProjectDomainsResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectsGetProjectDomains.d.ts.map