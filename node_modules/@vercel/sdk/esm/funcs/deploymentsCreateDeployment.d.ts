import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateDeploymentRequest, CreateDeploymentResponseBody } from "../models/createdeploymentop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create a new deployment
 *
 * @remarks
 * Create a new deployment with all the required and intended data. If the deployment is not a git deployment, all files must be provided with the request, either referenced or inlined. Additionally, a deployment id can be specified to redeploy a previous deployment.
 */
export declare function deploymentsCreateDeployment(client: VercelCore, request: CreateDeploymentRequest, options?: RequestOptions): APIPromise<Result<CreateDeploymentResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=deploymentsCreateDeployment.d.ts.map