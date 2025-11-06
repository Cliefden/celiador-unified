import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { RemoveBypassIpRequest, RemoveBypassIpResponseBody } from "../models/removebypassipop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Remove System Bypass Rule
 *
 * @remarks
 * Remove system bypass rules
 */
export declare function securityRemoveBypassIp(client: VercelCore, request: RemoveBypassIpRequest, options?: RequestOptions): APIPromise<Result<RemoveBypassIpResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=securityRemoveBypassIp.d.ts.map