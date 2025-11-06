import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ArtifactQueryRequest, ResponseBody } from "../models/artifactqueryop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Query information about an artifact
 *
 * @remarks
 * Query information about an array of artifacts.
 */
export declare function artifactsArtifactQuery(client: VercelCore, request: ArtifactQueryRequest, options?: RequestOptions): APIPromise<Result<{
    [k: string]: ResponseBody | null;
}, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=artifactsArtifactQuery.d.ts.map