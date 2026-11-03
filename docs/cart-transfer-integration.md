# Basket transfer: verified integration path, not enabled

Checked 2026-11-03 against the provider's public documentation:

- https://wizbi.store/api
- https://wizbi.store/developers
- https://wizbi.store/api/v1/openapi.json

WizStore documents a server-authenticated `GET /api/v1/cart-link` endpoint taking a chain, item descriptions/barcodes and optional city. It returns a link for continuing on a retailer's ordering site. This is a concrete potential route beyond copying a list. The published supported-chain counts differ between the pricing and developer pages; support must be verified for each enabled retailer before release.

The provider explicitly requires an Enterprise agreement for competing price-comparison services. Salik fits that described use case; the free developer plan or generic commercial-plan price must not be treated as authorization. No agreement, key, quote, account creation, payment or live cart-transfer test has been completed. The endpoint is therefore not connected or advertised as available in Salik.

## Implementation after obtaining an applicable agreement and key

1. Keep the key in a server-only Vercel environment variable. Use a fixed provider endpoint and an allowlist of retailer destinations; never expose the key in JavaScript, links or logs.
2. Map Salik chain IDs to the provider's supported chain IDs. Preserve barcode, quantity and weight units; retailer-scoped codes must not be treated as global GTINs. Verify how the provider accepts quantities and reports unresolved items.
3. Show a review screen with selected retailer, requested products, quantities, unmatched products and proposed substitutions. Do not imply a physical branch's shelf total is the online checkout total.
4. Generate the continuation link on explicit user action. The provider says Rami Levy links replace an existing cart: require an explicit warning/choice. Shufersal links open a list from which the user selects items. Login, delivery-slot selection and payment remain on the retailer's site.
5. Verify each retailer on desktop and mobile with a known test basket: correct products, quantities, weight units, missing products, existing-cart behavior, errors and actual destination. Keep unsupported retailers on the honest copy-list flow.

The provider calls this a pilot with no general availability guarantee. A direct authorized retailer partnership is another possible route, but no such integration has been obtained or tested here.
