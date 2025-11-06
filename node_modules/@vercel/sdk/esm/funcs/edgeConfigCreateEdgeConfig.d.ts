import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateEdgeConfigRequest, CreateEdgeConfigResponseBody } from "../models/createedgeconfigop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create an Edge Config
 *
 * @remarks
 * Creates an Edge Config.
 */
export declare function edgeConfigCreateEdgeConfig(client: VercelCore, request: CreateEdgeConfigRequest, options?: RequestOptions): APIPromise<Result<CreateEdgeConfigResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=edgeConfigCreateEdgeConfig.d.ts.map