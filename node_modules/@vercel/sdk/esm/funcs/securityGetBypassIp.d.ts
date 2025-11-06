import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetBypassIpRequest, GetBypassIpResponseBody } from "../models/getbypassipop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Read System Bypass
 *
 * @remarks
 * Retrieve the system bypass rules configured for the specified project
 */
export declare function securityGetBypassIp(client: VercelCore, request: GetBypassIpRequest, options?: RequestOptions): APIPromise<Result<GetBypassIpResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=securityGetBypassIp.d.ts.map