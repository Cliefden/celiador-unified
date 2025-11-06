import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { UpdateAccessGroupRequest, UpdateAccessGroupResponseBody } from "../models/updateaccessgroupop.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update an access group
 *
 * @remarks
 * Allows to update an access group metadata
 */
export declare function accessGroupsUpdateAccessGroup(client: VercelCore, request: UpdateAccessGroupRequest, options?: RequestOptions): APIPromise<Result<UpdateAccessGroupResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=accessGroupsUpdateAccessGroup.d.ts.map