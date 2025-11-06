import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { BatchRemoveProjectEnvRequest, BatchRemoveProjectEnvResponseBody } from "../models/batchremoveprojectenvop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Batch remove environment variables
 *
 * @remarks
 * Delete multiple environment variables for a given project in a single batch operation.
 */
export declare function projectsBatchRemoveProjectEnv(client: VercelCore, request: BatchRemoveProjectEnvRequest, options?: RequestOptions): APIPromise<Result<BatchRemoveProjectEnvResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectsBatchRemoveProjectEnv.d.ts.map