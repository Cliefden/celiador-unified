import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { UpdateFirewallConfigRequest, UpdateFirewallConfigResponseBody } from "../models/updatefirewallconfigop.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update Firewall Configuration
 *
 * @remarks
 * Process updates to modify the existing firewall config for a project
 */
export declare function securityUpdateFirewallConfig(client: VercelCore, request: UpdateFirewallConfigRequest, options?: RequestOptions): APIPromise<Result<UpdateFirewallConfigResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=securityUpdateFirewallConfig.d.ts.map