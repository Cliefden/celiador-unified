import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetActiveAttackStatusRequest, GetActiveAttackStatusResponseBody } from "../models/getactiveattackstatusop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Read active attack data
 *
 * @remarks
 * Retrieve active attack data within the last N days (default: 1 day)
 */
export declare function securityGetActiveAttackStatus(client: VercelCore, request: GetActiveAttackStatusRequest, options?: RequestOptions): APIPromise<Result<GetActiveAttackStatusResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=securityGetActiveAttackStatus.d.ts.map