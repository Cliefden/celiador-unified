import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetContactInfoSchemaDomainsRegistrarResponseBody, GetContactInfoSchemaRequest, GetContactInfoSchemaResponseBody } from "../models/getcontactinfoschemaop.js";
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
 * Get contact info schema
 *
 * @remarks
 * Some TLDs require additional contact information. Use this endpoint to get the schema for the tld-specific contact information for a domain.
 */
export declare function domainsRegistrarGetContactInfoSchema(client: VercelCore, request: GetContactInfoSchemaRequest, options?: RequestOptions): APIPromise<Result<GetContactInfoSchemaResponseBody, GetContactInfoSchemaDomainsRegistrarResponseBody | Unauthorized | NotAuthorizedForScope | TooManyRequests | InternalServerError | VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=domainsRegistrarGetContactInfoSchema.d.ts.map