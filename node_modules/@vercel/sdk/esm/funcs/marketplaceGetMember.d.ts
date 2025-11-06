import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetMemberRequest, GetMemberResponseBody } from "../models/getmemberop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get Member Information
 *
 * @remarks
 * Returns the member role and other information for a given member ID ("user_id" claim in the SSO OIDC token).
 */
export declare function marketplaceGetMember(client: VercelCore, request: GetMemberRequest, options?: RequestOptions): APIPromise<Result<GetMemberResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=marketplaceGetMember.d.ts.map