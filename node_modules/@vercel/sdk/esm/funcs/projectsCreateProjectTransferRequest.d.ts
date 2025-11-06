import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateProjectTransferRequestRequest, CreateProjectTransferRequestResponseBody } from "../models/createprojecttransferrequestop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create project transfer request
 *
 * @remarks
 * Initiates a project transfer request from one team to another. <br/> Returns a `code` that remains valid for 24 hours and can be used to accept the transfer request by another team using the `PUT /projects/transfer-request/:code` endpoint. <br/> Users can also accept the project transfer request using the claim URL: `https://vercel.com/claim-deployment?code=<code>&returnUrl=<returnUrl>`. <br/> The `code` parameter specifies the project transfer request code generated using this endpoint. <br/> The `returnUrl` parameter redirects users to a specific page of the application if the claim URL is invalid or expired.
 */
export declare function projectsCreateProjectTransferRequest(client: VercelCore, request: CreateProjectTransferRequestRequest, options?: RequestOptions): APIPromise<Result<CreateProjectTransferRequestResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectsCreateProjectTransferRequest.d.ts.map