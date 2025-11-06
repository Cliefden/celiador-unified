import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { PutFirewallConfigRequest, PutFirewallConfigResponseBody } from "../models/putfirewallconfigop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Put Firewall Configuration
 *
 * @remarks
 * Set the firewall configuration to provided rules and settings. Creates or overwrite the existing firewall configuration.
 */
export declare function securityPutFirewallConfig(client: VercelCore, request: PutFirewallConfigRequest, options?: RequestOptions): APIPromise<Result<PutFirewallConfigResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=securityPutFirewallConfig.d.ts.map