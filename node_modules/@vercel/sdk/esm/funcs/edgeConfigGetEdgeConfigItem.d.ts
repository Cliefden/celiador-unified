import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { EdgeConfigItem } from "../models/edgeconfigitem.js";
import { GetEdgeConfigItemRequest } from "../models/getedgeconfigitemop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get an Edge Config item
 *
 * @remarks
 * Returns a specific Edge Config Item.
 */
export declare function edgeConfigGetEdgeConfigItem(client: VercelCore, request: GetEdgeConfigItemRequest, options?: RequestOptions): APIPromise<Result<EdgeConfigItem, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=edgeConfigGetEdgeConfigItem.d.ts.map