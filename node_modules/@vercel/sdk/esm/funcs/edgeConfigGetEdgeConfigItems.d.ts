import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { EdgeConfigItem } from "../models/edgeconfigitem.js";
import { GetEdgeConfigItemsRequest } from "../models/getedgeconfigitemsop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get Edge Config items
 *
 * @remarks
 * Returns all items of an Edge Config.
 */
export declare function edgeConfigGetEdgeConfigItems(client: VercelCore, request: GetEdgeConfigItemsRequest, options?: RequestOptions): APIPromise<Result<Array<EdgeConfigItem>, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=edgeConfigGetEdgeConfigItems.d.ts.map