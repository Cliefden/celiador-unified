import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetEdgeConfigBackupRequest, GetEdgeConfigBackupResponseBody } from "../models/getedgeconfigbackupop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get Edge Config backup
 *
 * @remarks
 * Retrieves a specific version of an Edge Config from backup storage.
 */
export declare function edgeConfigGetEdgeConfigBackup(client: VercelCore, request: GetEdgeConfigBackupRequest, options?: RequestOptions): APIPromise<Result<GetEdgeConfigBackupResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=edgeConfigGetEdgeConfigBackup.d.ts.map