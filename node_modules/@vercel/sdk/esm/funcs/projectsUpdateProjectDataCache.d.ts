import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { UpdateProjectDataCacheRequest, UpdateProjectDataCacheResponseBody } from "../models/updateprojectdatacacheop.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update the data cache feature
 *
 * @remarks
 * Update the data cache feature on a project.
 */
export declare function projectsUpdateProjectDataCache(client: VercelCore, request: UpdateProjectDataCacheRequest, options?: RequestOptions): APIPromise<Result<UpdateProjectDataCacheResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectsUpdateProjectDataCache.d.ts.map