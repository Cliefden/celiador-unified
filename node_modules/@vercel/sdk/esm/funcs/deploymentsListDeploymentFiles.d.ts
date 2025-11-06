import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { FileTree } from "../models/filetree.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ListDeploymentFilesRequest } from "../models/listdeploymentfilesop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List Deployment Files
 *
 * @remarks
 * Allows to retrieve the file structure of the source code of a deployment by supplying the deployment unique identifier. If the deployment was created with the Vercel CLI or the API directly with the `files` key, it will have a file tree that can be retrievable.
 */
export declare function deploymentsListDeploymentFiles(client: VercelCore, request: ListDeploymentFilesRequest, options?: RequestOptions): APIPromise<Result<Array<FileTree>, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=deploymentsListDeploymentFiles.d.ts.map