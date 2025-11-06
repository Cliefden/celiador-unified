import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetFirewallConfigRequest, GetFirewallConfigResponseBody } from "../models/getfirewallconfigop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Read Firewall Configuration
 *
 * @remarks
 * Retrieve the specified firewall configuration for a project. The deployed configVersion will be `active`
 */
export declare function securityGetFirewallConfig(client: VercelCore, request: GetFirewallConfigRequest, options?: RequestOptions): APIPromise<Result<GetFirewallConfigResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=securityGetFirewallConfig.d.ts.map