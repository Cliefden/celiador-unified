import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ListAccessGroupMembersRequest, ListAccessGroupMembersResponseBody } from "../models/listaccessgroupmembersop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List members of an access group
 *
 * @remarks
 * List members of an access group
 */
export declare function accessGroupsListAccessGroupMembers(client: VercelCore, request: ListAccessGroupMembersRequest, options?: RequestOptions): APIPromise<Result<ListAccessGroupMembersResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=accessGroupsListAccessGroupMembers.d.ts.map