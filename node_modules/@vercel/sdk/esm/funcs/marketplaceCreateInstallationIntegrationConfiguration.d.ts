import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { PostV1InstallationsIntegrationConfigurationIdResourcesResourceIdExperimentationItemsRequest } from "../models/postv1installationsintegrationconfigurationidresourcesresourceidexperimentationitemsop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create one or multiple experimentation items
 *
 * @remarks
 * Create one or multiple experimentation items
 */
export declare function marketplaceCreateInstallationIntegrationConfiguration(client: VercelCore, request: PostV1InstallationsIntegrationConfigurationIdResourcesResourceIdExperimentationItemsRequest, options?: RequestOptions): APIPromise<Result<void, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=marketplaceCreateInstallationIntegrationConfiguration.d.ts.map