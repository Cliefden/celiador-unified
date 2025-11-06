import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetEdgeConfigBackupsRequest, GetEdgeConfigBackupsResponseBody } from "../models/getedgeconfigbackupsop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get Edge Config backups
 *
 * @remarks
 * Returns backups of an Edge Config.
 */
export declare function edgeConfigGetEdgeConfigBackups(client: VercelCore, request: GetEdgeConfigBackupsRequest, options?: RequestOptions): APIPromise<Result<GetEdgeConfigBackupsResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=edgeConfigGetEdgeConfigBackups.d.ts.map