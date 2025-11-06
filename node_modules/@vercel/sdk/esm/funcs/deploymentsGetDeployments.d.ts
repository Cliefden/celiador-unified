import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetDeploymentsRequest, GetDeploymentsResponseBody } from "../models/getdeploymentsop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List deployments
 *
 * @remarks
 * List deployments under the authenticated user or team. If a deployment hasn't finished uploading (is incomplete), the `url` property will have a value of `null`.
 */
export declare function deploymentsGetDeployments(client: VercelCore, request: GetDeploymentsRequest, options?: RequestOptions): APIPromise<Result<GetDeploymentsResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=deploymentsGetDeployments.d.ts.map