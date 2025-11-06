import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetDomainTransferInDomainsRegistrarResponseBody, GetDomainTransferInRequest, GetDomainTransferInResponseBody } from "../models/getdomaintransferinop.js";
import { HttpApiDecodeError } from "../models/httpapidecodeerror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { InternalServerError } from "../models/internalservererror.js";
import { NotFound } from "../models/notfound.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { TooManyRequests } from "../models/toomanyrequests.js";
import { Unauthorized } from "../models/unauthorized.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get a domain's transfer status
 *
 * @remarks
 * Get the transfer status for a domain
 */
export declare function domainsRegistrarGetDomainTransferIn(client: VercelCore, request: GetDomainTransferInRequest, options?: RequestOptions): APIPromise<Result<GetDomainTransferInResponseBody, HttpApiDecodeError | Unauthorized | GetDomainTransferInDomainsRegistrarResponseBody | NotFound | TooManyRequests | InternalServerError | VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=domainsRegistrarGetDomainTransferIn.d.ts.map