import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ReadAccessGroupProjectRequest, ReadAccessGroupProjectResponseBody } from "../models/readaccessgroupprojectop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Reads an access group project
 *
 * @remarks
 * Allows reading an access group project
 */
export declare function accessGroupsReadAccessGroupProject(client: VercelCore, request: ReadAccessGroupProjectRequest, options?: RequestOptions): APIPromise<Result<ReadAccessGroupProjectResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=accessGroupsReadAccessGroupProject.d.ts.map