import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ListAccessGroupProjectsRequest, ListAccessGroupProjectsResponseBody } from "../models/listaccessgroupprojectsop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List projects of an access group
 *
 * @remarks
 * List projects of an access group
 */
export declare function accessGroupsListAccessGroupProjects(client: VercelCore, request: ListAccessGroupProjectsRequest, options?: RequestOptions): APIPromise<Result<ListAccessGroupProjectsResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=accessGroupsListAccessGroupProjects.d.ts.map