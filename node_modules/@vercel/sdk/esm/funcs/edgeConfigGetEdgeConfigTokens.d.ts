import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { EdgeConfigToken } from "../models/edgeconfigtoken.js";
import { GetEdgeConfigTokensRequest } from "../models/getedgeconfigtokensop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get all tokens of an Edge Config
 *
 * @remarks
 * Returns all tokens of an Edge Config.
 */
export declare function edgeConfigGetEdgeConfigTokens(client: VercelCore, request: GetEdgeConfigTokensRequest, options?: RequestOptions): APIPromise<Result<EdgeConfigToken, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=edgeConfigGetEdgeConfigTokens.d.ts.map