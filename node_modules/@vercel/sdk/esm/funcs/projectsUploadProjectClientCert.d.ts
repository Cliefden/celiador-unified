import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { UploadProjectClientCertRequest, UploadProjectClientCertResponseBody } from "../models/uploadprojectclientcertop.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Upload client certificate for egress mTLS
 *
 * @remarks
 * Upload a client certificate for mTLS authentication to external origins.
 */
export declare function projectsUploadProjectClientCert(client: VercelCore, request: UploadProjectClientCertRequest, options?: RequestOptions): APIPromise<Result<UploadProjectClientCertResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=projectsUploadProjectClientCert.d.ts.map