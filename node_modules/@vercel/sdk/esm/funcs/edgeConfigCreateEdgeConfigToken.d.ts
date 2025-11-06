import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateEdgeConfigTokenRequest, CreateEdgeConfigTokenResponseBody } from "../models/createedgeconfigtokenop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create an Edge Config token
 *
 * @remarks
 * Adds a token to an existing Edge Config.
 */
export declare function edgeConfigCreateEdgeConfigToken(client: VercelCore, request: CreateEdgeConfigTokenRequest, options?: RequestOptions): APIPromise<Result<CreateEdgeConfigTokenResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=edgeConfigCreateEdgeConfigToken.d.ts.map