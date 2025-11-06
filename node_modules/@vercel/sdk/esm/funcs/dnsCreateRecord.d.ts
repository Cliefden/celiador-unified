import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateRecordRequest, CreateRecordResponseBody } from "../models/createrecordop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create a DNS record
 *
 * @remarks
 * Creates a DNS record for a domain.
 */
export declare function dnsCreateRecord(client: VercelCore, request: CreateRecordRequest, options?: RequestOptions): APIPromise<Result<CreateRecordResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=dnsCreateRecord.d.ts.map