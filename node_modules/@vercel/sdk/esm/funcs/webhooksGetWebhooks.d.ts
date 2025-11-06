import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetWebhooksRequest, GetWebhooksResponseBody } from "../models/getwebhooksop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get a list of webhooks
 *
 * @remarks
 * Get a list of webhooks
 */
export declare function webhooksGetWebhooks(client: VercelCore, request: GetWebhooksRequest, options?: RequestOptions): APIPromise<Result<GetWebhooksResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=webhooksGetWebhooks.d.ts.map