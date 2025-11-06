import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CancelDeploymentRequest, CancelDeploymentResponseBody } from "../models/canceldeploymentop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Cancel a deployment
 *
 * @remarks
 * This endpoint allows you to cancel a deployment which is currently building, by supplying its `id` in the URL.
 */
export declare function deploymentsCancelDeployment(client: VercelCore, request: CancelDeploymentRequest, options?: RequestOptions): APIPromise<Result<CancelDeploymentResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=deploymentsCancelDeployment.d.ts.map