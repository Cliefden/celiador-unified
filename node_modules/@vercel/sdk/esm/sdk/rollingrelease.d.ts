import { ClientSDK, RequestOptions } from "../lib/sdks.js";
import { ApproveRollingReleaseStageRequest, ApproveRollingReleaseStageResponseBody } from "../models/approverollingreleasestageop.js";
import { CompleteRollingReleaseRequest, CompleteRollingReleaseResponseBody } from "../models/completerollingreleaseop.js";
import { DeleteRollingReleaseConfigRequest, DeleteRollingReleaseConfigResponseBody } from "../models/deleterollingreleaseconfigop.js";
import { GetRollingReleaseBillingStatusRequest, GetRollingReleaseBillingStatusResponseBody } from "../models/getrollingreleasebillingstatusop.js";
import { GetRollingReleaseConfigRequest, GetRollingReleaseConfigResponseBody } from "../models/getrollingreleaseconfigop.js";
import { GetRollingReleaseRequest, GetRollingReleaseResponseBody } from "../models/getrollingreleaseop.js";
import { UpdateRollingReleaseConfigRequest, UpdateRollingReleaseConfigResponseBody } from "../models/updaterollingreleaseconfigop.js";
export declare class RollingRelease extends ClientSDK {
    /**
     * Get rolling release billing status
     *
     * @remarks
     * Get the Rolling Releases billing status for a project. The team level billing status is used to determine if the project can be configured for rolling releases.
     */
    getRollingReleaseBillingStatus(request: GetRollingReleaseBillingStatusRequest, options?: RequestOptions): Promise<GetRollingReleaseBillingStatusResponseBody>;
    /**
     * Get rolling release configuration
     *
     * @remarks
     * Get the Rolling Releases configuration for a project. The project-level config is simply a template that will be used for any future rolling release, and not the configuration for any active rolling release.
     */
    getRollingReleaseConfig(request: GetRollingReleaseConfigRequest, options?: RequestOptions): Promise<GetRollingReleaseConfigResponseBody>;
    /**
     * Delete rolling release configuration
     *
     * @remarks
     * Disable Rolling Releases for a project means that future deployments will not undergo a rolling release. Changing the config never alters a rollout that's already in-flight—it only affects the next production deployment. If you want to also stop the current rollout, call this endpoint to disable the feature, and then call either the /complete or /abort endpoint.
     */
    deleteRollingReleaseConfig(request: DeleteRollingReleaseConfigRequest, options?: RequestOptions): Promise<DeleteRollingReleaseConfigResponseBody>;
    /**
     * Update the rolling release settings for the project
     *
     * @remarks
     * Update (or disable) Rolling Releases for a project. Changing the config never alters a rollout that's already in-flight. It only affects the next production deployment. This also applies to disabling Rolling Releases. If you want to also stop the current rollout, call this endpoint to disable the feature, and then call either the /complete or /abort endpoint. Note: Enabling Rolling Releases automatically enables skew protection on the project with the default value if it wasn't configured already.
     */
    updateRollingReleaseConfig(request: UpdateRollingReleaseConfigRequest, options?: RequestOptions): Promise<UpdateRollingReleaseConfigResponseBody>;
    /**
     * Get the active rolling release information for a project
     *
     * @remarks
     * Return the Rolling Release for a project, regardless of whether the rollout is active, aborted, or completed. If the feature is enabled but no deployment has occurred yet, null will be returned.
     */
    getRollingRelease(request: GetRollingReleaseRequest, options?: RequestOptions): Promise<GetRollingReleaseResponseBody>;
    /**
     * Update the active rolling release to the next stage for a project
     *
     * @remarks
     * Advance a rollout to the next stage. This is only needed when rolling releases is configured to require manual approval.
     */
    approveRollingReleaseStage(request: ApproveRollingReleaseStageRequest, options?: RequestOptions): Promise<ApproveRollingReleaseStageResponseBody>;
    /**
     * Complete the rolling release for the project
     *
     * @remarks
     * Force-complete a Rolling Release. The canary deployment will begin serving 100% of the traffic.
     */
    completeRollingRelease(request: CompleteRollingReleaseRequest, options?: RequestOptions): Promise<CompleteRollingReleaseResponseBody>;
}
//# sourceMappingURL=rollingrelease.d.ts.map