import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetBulkAvailabilityRequest, GetBulkAvailabilityResponseBody } from "../models/getbulkavailabilityop.js";
import { HttpApiDecodeError } from "../models/httpapidecodeerror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { InternalServerError } from "../models/internalservererror.js";
import { NotAuthorizedForScope } from "../models/notauthorizedforscope.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { TooManyRequests } from "../models/toomanyrequests.js";
import { Unauthorized } from "../models/unauthorized.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get availability for multiple domains
 *
 * @remarks
 * Get availability for multiple domains. If the domains are available, they can be purchased using the [Buy a domain](https://vercel.com/docs/rest-api/reference/endpoints/domains-registrar/buy-a-domain) endpoint or the [Buy multiple domains](https://vercel.com/docs/rest-api/reference/endpoints/domains-registrar/buy-multiple-domains) endpoint.
 */
export declare function domainsRegistrarGetBulkAvailability(client: VercelCore, request: GetBulkAvailabilityRequest, options?: RequestOptions): APIPromise<Result<GetBulkAvailabilityResponseBody, HttpApiDecodeError | Unauthorized | NotAuthorizedForScope | TooManyRequests | InternalServerError | VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=domainsRegistrarGetBulkAvailability.d.ts.map