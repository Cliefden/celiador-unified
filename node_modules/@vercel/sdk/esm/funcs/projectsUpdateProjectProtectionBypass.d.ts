import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { UpdateProjectProtectionBypassRequest, UpdateProjectProtectionBypassResponseBody } from "../models/updateprojectprotectionbypassop.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update Protection Bypass for Automation
 *
 * @remarks
 * Update the deployment protection automation bypass for a project
 */
export declare function projectsUpdateProjectProtectionBypass(client: VercelCore, request: UpdateProjectProtectionBypassRequest, options?: RequestOptions): APIPromise<Result<UpdateProjectProtectionBypassResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectsUpdateProjectProtectionBypass.d.ts.map