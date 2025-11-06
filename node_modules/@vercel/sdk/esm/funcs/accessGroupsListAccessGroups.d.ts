import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ListAccessGroupsRequest, ListAccessGroupsResponseBody } from "../models/listaccessgroupsop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List access groups for a team, project or member
 *
 * @remarks
 * List access groups
 */
export declare function accessGroupsListAccessGroups(client: VercelCore, request: ListAccessGroupsRequest, options?: RequestOptions): APIPromise<Result<ListAccessGroupsResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=accessGroupsListAccessGroups.d.ts.map