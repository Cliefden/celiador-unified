import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { HeadV1InstallationsIntegrationConfigurationIdResourcesResourceIdExperimentationEdgeConfigRequest, HeadV1InstallationsIntegrationConfigurationIdResourcesResourceIdExperimentationEdgeConfigResponseBody } from "../models/headv1installationsintegrationconfigurationidresourcesresourceidexperimentationedgeconfigop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get the data of a user-provided Edge Config
 *
 * @remarks
 * When the user enabled Edge Config syncing, then this endpoint can be used by the partner to fetch the contents of the Edge Config.
 */
export declare function marketplaceCreateInstallationIntegrationEdgeConfig(client: VercelCore, request: HeadV1InstallationsIntegrationConfigurationIdResourcesResourceIdExperimentationEdgeConfigRequest, options?: RequestOptions): APIPromise<Result<HeadV1InstallationsIntegrationConfigurationIdResourcesResourceIdExperimentationEdgeConfigResponseBody | undefined, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=marketplaceCreateInstallationIntegrationEdgeConfig.d.ts.map