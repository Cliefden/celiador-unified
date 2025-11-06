import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DeleteV1InstallationsIntegrationConfigurationIdResourcesResourceIdExperimentationItemsItemIdRequest } from "../models/deletev1installationsintegrationconfigurationidresourcesresourceidexperimentationitemsitemidop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Delete an existing experimentation item
 *
 * @remarks
 * Delete an existing experimentation item
 */
export declare function marketplaceDeleteInstallationIntegrationConfiguration(client: VercelCore, request: DeleteV1InstallationsIntegrationConfigurationIdResourcesResourceIdExperimentationItemsItemIdRequest, options?: RequestOptions): APIPromise<Result<void, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=marketplaceDeleteInstallationIntegrationConfiguration.d.ts.map