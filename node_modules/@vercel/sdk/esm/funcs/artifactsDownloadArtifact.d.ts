import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DownloadArtifactRequest } from "../models/downloadartifactop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Download a cache artifact
 *
 * @remarks
 * Downloads a cache artifact indentified by its `hash` specified on the request path. The artifact is downloaded as an octet-stream. The client should verify the content-length header and response body.
 */
export declare function artifactsDownloadArtifact(client: VercelCore, request: DownloadArtifactRequest, options?: RequestOptions): APIPromise<Result<ReadableStream<Uint8Array>, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=artifactsDownloadArtifact.d.ts.map