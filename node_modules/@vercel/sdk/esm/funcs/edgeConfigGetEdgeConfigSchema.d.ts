import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetEdgeConfigSchemaRequest, GetEdgeConfigSchemaResponseBody } from "../models/getedgeconfigschemaop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get Edge Config schema
 *
 * @remarks
 * Returns the schema of an Edge Config.
 */
export declare function edgeConfigGetEdgeConfigSchema(client: VercelCore, request: GetEdgeConfigSchemaRequest, options?: RequestOptions): APIPromise<Result<GetEdgeConfigSchemaResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=edgeConfigGetEdgeConfigSchema.d.ts.map