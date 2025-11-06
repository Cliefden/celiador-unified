import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetWebhookRequest, GetWebhookResponseBody } from "../models/getwebhookop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get a webhook
 *
 * @remarks
 * Get a webhook
 */
export declare function webhooksGetWebhook(client: VercelCore, request: GetWebhookRequest, options?: RequestOptions): APIPromise<Result<GetWebhookResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=webhooksGetWebhook.d.ts.map