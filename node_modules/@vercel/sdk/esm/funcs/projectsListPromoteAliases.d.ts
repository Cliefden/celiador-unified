import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ListPromoteAliasesRequest, ListPromoteAliasesResponseBody } from "../models/listpromotealiasesop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Gets a list of aliases with status for the current promote
 *
 * @remarks
 * Get a list of aliases related to the last promote request with their mapping status
 */
export declare function projectsListPromoteAliases(client: VercelCore, request: ListPromoteAliasesRequest, options?: RequestOptions): APIPromise<Result<ListPromoteAliasesResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectsListPromoteAliases.d.ts.map