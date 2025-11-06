import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { PatchEdgeConfigItemsRequest, PatchEdgeConfigItemsResponseBody } from "../models/patchedgeconfigitemsop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update Edge Config items in batch
 *
 * @remarks
 * Update multiple Edge Config Items in batch.
 */
export declare function edgeConfigPatchEdgeConfigItems(client: VercelCore, request: PatchEdgeConfigItemsRequest, options?: RequestOptions): APIPromise<Result<PatchEdgeConfigItemsResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=edgeConfigPatchEdgeConfigItems.d.ts.map