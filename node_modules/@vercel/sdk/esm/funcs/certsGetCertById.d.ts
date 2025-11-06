import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetCertByIdRequest, GetCertByIdResponseBody } from "../models/getcertbyidop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get cert by id
 *
 * @remarks
 * Get cert by id
 */
export declare function certsGetCertById(client: VercelCore, request: GetCertByIdRequest, options?: RequestOptions): APIPromise<Result<GetCertByIdResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=certsGetCertById.d.ts.map