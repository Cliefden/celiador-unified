import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { PutV1InstallationsIntegrationConfigurationIdResourcesResourceIdExperimentationEdgeConfigRequest, PutV1InstallationsIntegrationConfigurationIdResourcesResourceIdExperimentationEdgeConfigResponseBody } from "../models/putv1installationsintegrationconfigurationidresourcesresourceidexperimentationedgeconfigop.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Push data into a user-provided Edge Config
 *
 * @remarks
 * When the user enabled Edge Config syncing, then this endpoint can be used by the partner to push their configuration data into the relevant Edge Config.
 */
export declare function marketplaceUpdateInstallationIntegrationEdgeConfig(client: VercelCore, request: PutV1InstallationsIntegrationConfigurationIdResourcesResourceIdExperimentationEdgeConfigRequest, options?: RequestOptions): APIPromise<Result<PutV1InstallationsIntegrationConfigurationIdResourcesResourceIdExperimentationEdgeConfigResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=marketplaceUpdateInstallationIntegrationEdgeConfig.d.ts.map