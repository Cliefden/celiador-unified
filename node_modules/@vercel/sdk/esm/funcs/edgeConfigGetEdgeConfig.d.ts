import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetEdgeConfigRequest, GetEdgeConfigResponseBody } from "../models/getedgeconfigop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get an Edge Config
 *
 * @remarks
 * Returns an Edge Config.
 */
export declare function edgeConfigGetEdgeConfig(client: VercelCore, request: GetEdgeConfigRequest, options?: RequestOptions): APIPromise<Result<GetEdgeConfigResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=edgeConfigGetEdgeConfig.d.ts.map