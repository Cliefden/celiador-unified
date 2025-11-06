import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { AcceptProjectTransferRequestRequest, AcceptProjectTransferRequestResponseBody } from "../models/acceptprojecttransferrequestop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Accept project transfer request
 *
 * @remarks
 * Accept a project transfer request initated by another team. <br/> The `code` is generated using the `POST /projects/:idOrName/transfer-request` endpoint.
 */
export declare function projectsAcceptProjectTransferRequest(client: VercelCore, request: AcceptProjectTransferRequestRequest, options?: RequestOptions): APIPromise<Result<AcceptProjectTransferRequestResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectsAcceptProjectTransferRequest.d.ts.map