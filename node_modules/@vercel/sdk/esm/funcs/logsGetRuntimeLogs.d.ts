import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetRuntimeLogsRequest, GetRuntimeLogsResponseBody } from "../models/getruntimelogsop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get logs for a deployment
 *
 * @remarks
 * Returns a stream of logs for a given deployment.
 */
export declare function logsGetRuntimeLogs(client: VercelCore, request: GetRuntimeLogsRequest, options?: RequestOptions): APIPromise<Result<GetRuntimeLogsResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=logsGetRuntimeLogs.d.ts.map