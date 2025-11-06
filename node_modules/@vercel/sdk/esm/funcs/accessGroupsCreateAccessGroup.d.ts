import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateAccessGroupRequest, CreateAccessGroupResponseBody } from "../models/createaccessgroupop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Creates an access group
 *
 * @remarks
 * Allows to create an access group
 */
export declare function accessGroupsCreateAccessGroup(client: VercelCore, request: CreateAccessGroupRequest, options?: RequestOptions): APIPromise<Result<CreateAccessGroupResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=accessGroupsCreateAccessGroup.d.ts.map