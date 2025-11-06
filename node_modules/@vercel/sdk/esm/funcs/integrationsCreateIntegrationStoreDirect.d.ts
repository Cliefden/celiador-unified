import { VercelCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateIntegrationStoreDirectRequest, CreateIntegrationStoreDirectResponseBody } from "../models/createintegrationstoredirectop.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/httpclienterrors.js";
import { ResponseValidationError } from "../models/responsevalidationerror.js";
import { SDKValidationError } from "../models/sdkvalidationerror.js";
import { VercelError } from "../models/vercelerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create integration store (free and paid plans)
 *
 * @remarks
 * Creates an integration store for both FREE and PAID billing plans. This simplified endpoint automatically provisions real integration storage resources while handling billing complexity behind the scenes. It supports both free and paid billing plans with automatic authorization creation for paid resources. ## How it works 1. Validates the integration configuration and product 2. For free resources: Auto-discovers available free billing plans 3. For paid resources: Creates billing authorization inline using provided billingPlanId 4. Provisions real resources through the Vercel Marketplace 5. Returns the created store with connection details ## Workflow Before using this endpoint, discover available products and billing plans: 1. List your configurations: `GET /v1/integrations/configurations` 2. Get products for a configuration: `GET /v1/integrations/configuration/{id}/products` 3. Get billing plans for a product: `GET /integrations/integration/{integrationId}/products/{productId}/plans` 4. Review the `metadataSchema` for each product to understand required metadata 5. Create storage with discovered product: `POST /v1/storage/stores/integration/direct` ## Usage Patterns - **Free resources**: Omit `billingPlanId` - endpoint will auto-discover free plans - **Paid resources**: Provide `billingPlanId` from billing plans discovery - **Prepayment plans**: Also provide `prepaymentAmountCents` for variable amount plans ## Limitations - **Admin access required**: Only integration configuration admins can create stores - **Storage limits apply**: Subject to your team's storage quotas - **Payment method required**: For paid plans, ensure valid payment method is configured ## Error Responses - `400 Bad Request`: Invalid input, no plans available, or billing issues - `403 Forbidden`: Insufficient permissions (non-admin users) - `404 Not Found`: Integration configuration or product not found - `429 Too Many Requests`: Rate limit exceeded
 */
export declare function integrationsCreateIntegrationStoreDirect(client: VercelCore, request: CreateIntegrationStoreDirectRequest, options?: RequestOptions): APIPromise<Result<CreateIntegrationStoreDirectResponseBody, VercelError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=integrationsCreateIntegrationStoreDirect.d.ts.map