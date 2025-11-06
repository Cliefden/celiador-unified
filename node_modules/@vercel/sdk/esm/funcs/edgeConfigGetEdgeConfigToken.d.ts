import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { EdgeConfigToken } from "../models/edgeconfigtoken.js";
import { GetEdgeConfigTokenRequest } from "../models/getedgeconfigtokenop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get Edge Config token meta data
 *
 * @remarks
 * Return meta data about an Edge Config token.
 */
export declare function edgeConfigGetEdgeConfigToken(client: VercelCore, request: GetEdgeConfigTokenRequest, options?: RequestOptions): APIPromise<Result<EdgeConfigToken, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=edgeConfigGetEdgeConfigToken.d.ts.map