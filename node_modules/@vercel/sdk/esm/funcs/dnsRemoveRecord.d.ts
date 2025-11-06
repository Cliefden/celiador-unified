import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { RemoveRecordRequest, RemoveRecordResponseBody } from "../models/removerecordop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Delete a DNS record
 *
 * @remarks
 * Removes an existing DNS record from a domain name.
 */
export declare function dnsRemoveRecord(client: VercelCore, request: RemoveRecordRequest, options?: RequestOptions): APIPromise<Result<RemoveRecordResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=dnsRemoveRecord.d.ts.map