import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { InvalidateByTagsRequest } from "../models/invalidatebytagsop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Invalidate by tag
 *
 * @remarks
 * Marks a cache tag as stale, causing cache entries associated with that tag to be revalidated in the background on the next request.
 */
export declare function edgeCacheInvalidateByTags(client: VercelCore, request: InvalidateByTagsRequest, options?: RequestOptions): APIPromise<Result<void, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=edgeCacheInvalidateByTags.d.ts.map