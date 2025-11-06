import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { GetDeploymentEventsRequest, GetDeploymentEventsResponse } from "../models/getdeploymenteventsop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
export declare enum GetDeploymentEventsAcceptEnum {
    applicationJson = "application/json",
    applicationStreamPlusJson = "application/stream+json"
}
/**
 * Get deployment events
 *
 * @remarks
 * Get the build logs of a deployment by deployment ID and build ID. It can work as an infinite stream of logs or as a JSON endpoint depending on the input parameters.
 */
export declare function deploymentsGetDeploymentEvents(client: VercelCore, request: GetDeploymentEventsRequest, options?: RequestOptions & {
    acceptHeaderOverride?: GetDeploymentEventsAcceptEnum;
}): APIPromise<Result<GetDeploymentEventsResponse, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=deploymentsGetDeploymentEvents.d.ts.map