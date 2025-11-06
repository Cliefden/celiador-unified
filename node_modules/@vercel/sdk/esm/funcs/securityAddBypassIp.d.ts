import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { AddBypassIpRequest, AddBypassIpResponseBody } from "../models/addbypassipop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create System Bypass Rule
 *
 * @remarks
 * Create new system bypass rules
 */
export declare function securityAddBypassIp(client: VercelCore, request: AddBypassIpRequest, options?: RequestOptions): APIPromise<Result<AddBypassIpResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=securityAddBypassIp.d.ts.map