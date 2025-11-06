import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetConfigurationRequest, GetConfigurationResponseBody } from "../models/getconfigurationop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Retrieve an integration configuration
 *
 * @remarks
 * Allows to retrieve a the configuration with the provided id in case it exists. The authenticated user or team must be the owner of the config in order to access it.
 */
export declare function integrationsGetConfiguration(client: VercelCore, request: GetConfigurationRequest, options?: RequestOptions): APIPromise<Result<GetConfigurationResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=integrationsGetConfiguration.d.ts.map