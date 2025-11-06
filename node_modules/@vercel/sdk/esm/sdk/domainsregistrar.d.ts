import { ClientSDK, RequestOptions } from "../lib/sdks.js";
import { BuyDomainsRequest, BuyDomainsResponseBody } from "../models/buydomainsop.js";
import { BuySingleDomainRequest, BuySingleDomainResponseBody } from "../models/buysingledomainop.js";
import { GetBulkAvailabilityRequest, GetBulkAvailabilityResponseBody } from "../models/getbulkavailabilityop.js";
import { GetContactInfoSchemaRequest, GetContactInfoSchemaResponseBody } from "../models/getcontactinfoschemaop.js";
import { GetDomainAuthCodeRequest, GetDomainAuthCodeResponseBody } from "../models/getdomainauthcodeop.js";
import { GetDomainAvailabilityRequest, GetDomainAvailabilityResponseBody } from "../models/getdomainavailabilityop.js";
import { GetDomainPriceRequest, GetDomainPriceResponseBody } from "../models/getdomainpriceop.js";
import { GetDomainTransferInRequest, GetDomainTransferInResponseBody } from "../models/getdomaintransferinop.js";
import { GetOrderRequest, GetOrderResponseBody } from "../models/getorderop.js";
import { GetSupportedTldsRequest } from "../models/getsupportedtldsop.js";
import { GetTldPriceRequest, GetTldPriceResponseBody } from "../models/gettldpriceop.js";
import { RenewDomainRequest, RenewDomainResponseBody } from "../models/renewdomainop.js";
import { TransferInDomainRequest, TransferInDomainResponseBody } from "../models/transferindomainop.js";
import { UpdateDomainAutoRenewRequest } from "../models/updatedomainautorenewop.js";
import { UpdateDomainNameserversRequest } from "../models/updatedomainnameserversop.js";
export declare class DomainsRegistrar extends ClientSDK {
    /**
     * Get supported TLDs
     *
     * @remarks
     * Get a list of TLDs supported by Vercel
     */
    getSupportedTlds(request: GetSupportedTldsRequest, options?: RequestOptions): Promise<Array<string>>;
    /**
     * Get TLD price data
     *
     * @remarks
     * Get price data for a specific TLD. This only reflects base prices for the given TLD. Premium domains may have different prices. Use the [Get price data for a domain](https://vercel.com/docs/rest-api/reference/endpoints/domains-registrar/get-price-data-for-a-domain) endpoint to get the price data for a specific domain.
     */
    getTldPrice(request: GetTldPriceRequest, options?: RequestOptions): Promise<GetTldPriceResponseBody>;
    /**
     * Get availability for a domain
     *
     * @remarks
     * Get availability for a specific domain. If the domain is available, it can be purchased using the [Buy a domain](https://vercel.com/docs/rest-api/reference/endpoints/domains-registrar/buy-a-domain) endpoint or the [Buy multiple domains](https://vercel.com/docs/rest-api/reference/endpoints/domains-registrar/buy-multiple-domains) endpoint.
     */
    getDomainAvailability(request: GetDomainAvailabilityRequest, options?: RequestOptions): Promise<GetDomainAvailabilityResponseBody>;
    /**
     * Get price data for a domain
     *
     * @remarks
     * Get price data for a specific domain
     */
    getDomainPrice(request: GetDomainPriceRequest, options?: RequestOptions): Promise<GetDomainPriceResponseBody>;
    /**
     * Get availability for multiple domains
     *
     * @remarks
     * Get availability for multiple domains. If the domains are available, they can be purchased using the [Buy a domain](https://vercel.com/docs/rest-api/reference/endpoints/domains-registrar/buy-a-domain) endpoint or the [Buy multiple domains](https://vercel.com/docs/rest-api/reference/endpoints/domains-registrar/buy-multiple-domains) endpoint.
     */
    getBulkAvailability(request: GetBulkAvailabilityRequest, options?: RequestOptions): Promise<GetBulkAvailabilityResponseBody>;
    /**
     * Get the auth code for a domain
     *
     * @remarks
     * Get the auth code for a domain. This is required to transfer a domain from Vercel to another registrar.
     */
    getDomainAuthCode(request: GetDomainAuthCodeRequest, options?: RequestOptions): Promise<GetDomainAuthCodeResponseBody>;
    /**
     * Buy a domain
     *
     * @remarks
     * Buy a domain
     */
    buySingleDomain(request: BuySingleDomainRequest, options?: RequestOptions): Promise<BuySingleDomainResponseBody>;
    /**
     * Buy multiple domains
     *
     * @remarks
     * Buy multiple domains at once
     */
    buyDomains(request: BuyDomainsRequest, options?: RequestOptions): Promise<BuyDomainsResponseBody>;
    /**
     * Transfer-in a domain
     *
     * @remarks
     * Transfer a domain in from another registrar
     */
    transferInDomain(request: TransferInDomainRequest, options?: RequestOptions): Promise<TransferInDomainResponseBody>;
    /**
     * Get a domain's transfer status
     *
     * @remarks
     * Get the transfer status for a domain
     */
    getDomainTransferIn(request: GetDomainTransferInRequest, options?: RequestOptions): Promise<GetDomainTransferInResponseBody>;
    /**
     * Renew a domain
     *
     * @remarks
     * Renew a domain
     */
    renewDomain(request: RenewDomainRequest, options?: RequestOptions): Promise<RenewDomainResponseBody>;
    /**
     * Update auto-renew for a domain
     *
     * @remarks
     * Update the auto-renew setting for a domain
     */
    updateDomainAutoRenew(request: UpdateDomainAutoRenewRequest, options?: RequestOptions): Promise<void>;
    /**
     * Update nameservers for a domain
     *
     * @remarks
     * Update the nameservers for a domain. Pass an empty array to use Vercel's default nameservers.
     */
    updateDomainNameservers(request: UpdateDomainNameserversRequest, options?: RequestOptions): Promise<void>;
    /**
     * Get contact info schema
     *
     * @remarks
     * Some TLDs require additional contact information. Use this endpoint to get the schema for the tld-specific contact information for a domain.
     */
    getContactInfoSchema(request: GetContactInfoSchemaRequest, options?: RequestOptions): Promise<GetContactInfoSchemaResponseBody>;
    /**
     * Get a domain order
     *
     * @remarks
     * Get information about a domain order by its ID
     */
    getOrder(request: GetOrderRequest, options?: RequestOptions): Promise<GetOrderResponseBody>;
}
//# sourceMappingURL=domainsregistrar.d.ts.map