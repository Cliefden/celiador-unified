import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ListDeploymentAliasesRequest, ListDeploymentAliasesResponseBody } from "../models/listdeploymentaliasesop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List Deployment Aliases
 *
 * @remarks
 * Retrieves all Aliases for the Deployment with the given ID. The authenticated user or team must own the deployment.
 */
export declare function aliasesListDeploymentAliases(client: VercelCore, request: ListDeploymentAliasesRequest, options?: RequestOptions): APIPromise<Result<ListDeploymentAliasesResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=aliasesListDeploymentAliases.d.ts.map