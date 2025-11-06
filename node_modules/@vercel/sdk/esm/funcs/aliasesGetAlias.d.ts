import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetAliasRequest, GetAliasResponseBody } from "../models/getaliasop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get an Alias
 *
 * @remarks
 * Retrieves an Alias for the given host name or alias ID.
 */
export declare function aliasesGetAlias(client: VercelCore, request: GetAliasRequest, options?: RequestOptions): APIPromise<Result<Array<GetAliasResponseBody>, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=aliasesGetAlias.d.ts.map