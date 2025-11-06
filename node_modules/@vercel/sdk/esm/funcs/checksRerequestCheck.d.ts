import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { RerequestCheckRequest, RerequestCheckResponseBody } from "../models/rerequestcheckop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Rerequest a check
 *
 * @remarks
 * Rerequest a selected check that has failed.
 */
export declare function checksRerequestCheck(client: VercelCore, request: RerequestCheckRequest, options?: RequestOptions): APIPromise<Result<RerequestCheckResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=checksRerequestCheck.d.ts.map