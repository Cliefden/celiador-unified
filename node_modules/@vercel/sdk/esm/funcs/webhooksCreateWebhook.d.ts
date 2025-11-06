import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateWebhookRequest, CreateWebhookResponseBody } from "../models/createwebhookop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Creates a webhook
 *
 * @remarks
 * Creates a webhook
 */
export declare function webhooksCreateWebhook(client: VercelCore, request: CreateWebhookRequest, options?: RequestOptions): APIPromise<Result<CreateWebhookResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=webhooksCreateWebhook.d.ts.map