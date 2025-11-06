import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { PatchV1InstallationsIntegrationConfigurationIdResourcesResourceIdExperimentationItemsItemIdRequest } from "../models/patchv1installationsintegrationconfigurationidresourcesresourceidexperimentationitemsitemidop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Patch an existing experimentation item
 *
 * @remarks
 * Patch an existing experimentation item
 */
export declare function marketplaceUpdateInstallationIntegrationConfiguration(client: VercelCore, request: PatchV1InstallationsIntegrationConfigurationIdResourcesResourceIdExperimentationItemsItemIdRequest, options?: RequestOptions): APIPromise<Result<void, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=marketplaceUpdateInstallationIntegrationConfiguration.d.ts.map