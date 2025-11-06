import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { PatchEdgeConfigSchemaRequest, PatchEdgeConfigSchemaResponseBody } from "../models/patchedgeconfigschemaop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update Edge Config schema
 *
 * @remarks
 * Update an Edge Config's schema.
 */
export declare function edgeConfigPatchEdgeConfigSchema(client: VercelCore, request: PatchEdgeConfigSchemaRequest, options?: RequestOptions): APIPromise<Result<PatchEdgeConfigSchemaResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=edgeConfigPatchEdgeConfigSchema.d.ts.map