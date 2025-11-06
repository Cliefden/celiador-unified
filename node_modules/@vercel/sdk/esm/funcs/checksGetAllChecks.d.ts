import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetAllChecksRequest, GetAllChecksResponseBody } from "../models/getallchecksop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Retrieve a list of all checks
 *
 * @remarks
 * List all of the checks created for a deployment.
 */
export declare function checksGetAllChecks(client: VercelCore, request: GetAllChecksRequest, options?: RequestOptions): APIPromise<Result<GetAllChecksResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=checksGetAllChecks.d.ts.map