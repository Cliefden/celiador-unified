import { ClientSDK, RequestOptions } from "../lib/sdks.js";
import { AssignAliasRequest, AssignAliasResponseBody } from "../models/assignaliasop.js";
import { DeleteAliasRequest, DeleteAliasResponseBody } from "../models/deletealiasop.js";
import { GetAliasRequest, GetAliasResponseBody } from "../models/getaliasop.js";
import { ListAliasesRequest, ListAliasesResponseBody } from "../models/listaliasesop.js";
import { ListDeploymentAliasesRequest, ListDeploymentAliasesResponseBody } from "../models/listdeploymentaliasesop.js";
import { PatchUrlProtectionBypassRequest } from "../models/patchurlprotectionbypassop.js";
export declare class Aliases extends ClientSDK {
    /**
     * List Deployment Aliases
     *
     * @remarks
     * Retrieves all Aliases for the Deployment with the given ID. The authenticated user or team must own the deployment.
     */
    listDeploymentAliases(request: ListDeploymentAliasesRequest, options?: RequestOptions): Promise<ListDeploymentAliasesResponseBody>;
    /**
     * Assign an Alias
     *
     * @remarks
     * Creates a new alias for the deployment with the given deployment ID. The authenticated user or team must own this deployment. If the desired alias is already assigned to another deployment, then it will be removed from the old deployment and assigned to the new one.
     */
    assignAlias(request: AssignAliasRequest, options?: RequestOptions): Promise<AssignAliasResponseBody>;
    /**
     * List aliases
     *
     * @remarks
     * Retrieves a list of aliases for the authenticated User or Team. When `domain` is provided, only aliases for that domain will be returned. When `projectId` is provided, it will only return the given project aliases.
     */
    listAliases(request: ListAliasesRequest, options?: RequestOptions): Promise<ListAliasesResponseBody>;
    /**
     * Get an Alias
     *
     * @remarks
     * Retrieves an Alias for the given host name or alias ID.
     */
    getAlias(request: GetAliasRequest, options?: RequestOptions): Promise<Array<GetAliasResponseBody>>;
    /**
     * Delete an Alias
     *
     * @remarks
     * Delete an Alias with the specified ID.
     */
    deleteAlias(request: DeleteAliasRequest, options?: RequestOptions): Promise<DeleteAliasResponseBody>;
    /**
     * Update the protection bypass for a URL
     *
     * @remarks
     * Update the protection bypass for the alias or deployment URL (used for user access & comment access for deployments). Used as shareable links and user scoped access for Vercel Authentication and also to allow external (logged in) people to comment on previews for Preview Comments (next-live-mode).
     */
    patchUrlProtectionBypass(request: PatchUrlProtectionBypassRequest, options?: RequestOptions): Promise<{
        [k: string]: any;
    }>;
}
//# sourceMappingURL=aliases.d.ts.map