import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ReadAccessGroupRequest, ReadAccessGroupResponseBody } from "../models/readaccessgroupop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Reads an access group
 *
 * @remarks
 * Allows to read an access group
 */
export declare function accessGroupsReadAccessGroup(client: VercelCore, request: ReadAccessGroupRequest, options?: RequestOptions): APIPromise<Result<ReadAccessGroupResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=accessGroupsReadAccessGroup.d.ts.map