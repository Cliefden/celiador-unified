import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetEdgeConfigsRequest, GetEdgeConfigsResponseBody } from "../models/getedgeconfigsop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get Edge Configs
 *
 * @remarks
 * Returns all Edge Configs.
 */
export declare function edgeConfigGetEdgeConfigs(client: VercelCore, request: GetEdgeConfigsRequest, options?: RequestOptions): APIPromise<Result<Array<GetEdgeConfigsResponseBody>, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=edgeConfigGetEdgeConfigs.d.ts.map