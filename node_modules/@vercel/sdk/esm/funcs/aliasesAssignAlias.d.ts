import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { AssignAliasRequest, AssignAliasResponseBody } from "../models/assignaliasop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Assign an Alias
 *
 * @remarks
 * Creates a new alias for the deployment with the given deployment ID. The authenticated user or team must own this deployment. If the desired alias is already assigned to another deployment, then it will be removed from the old deployment and assigned to the new one.
 */
export declare function aliasesAssignAlias(client: VercelCore, request: AssignAliasRequest, options?: RequestOptions): APIPromise<Result<AssignAliasResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=aliasesAssignAlias.d.ts.map