import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetRollingReleaseConfigRequest, GetRollingReleaseConfigResponseBody } from "../models/getrollingreleaseconfigop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get rolling release configuration
 *
 * @remarks
 * Get the Rolling Releases configuration for a project. The project-level config is simply a template that will be used for any future rolling release, and not the configuration for any active rolling release.
 */
export declare function rollingReleaseGetRollingReleaseConfig(client: VercelCore, request: GetRollingReleaseConfigRequest, options?: RequestOptions): APIPromise<Result<GetRollingReleaseConfigResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=rollingReleaseGetRollingReleaseConfig.d.ts.map