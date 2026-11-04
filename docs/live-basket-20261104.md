# Automatic, branch-priced shopping cart — 2026-11-04

The basket now starts comparing automatically when products, quantities, city, selected branches or delivery inclusion change. The default total is the cheapest **complete, current basket in one checked branch**. It is never the sum of unrelated item minima across retailers.

Each row displays the unit/kg price and quantity-adjusted subtotal for the same selected branch. The branch picker lists complete baskets in ascending total-price order; selecting one updates the summary and every line together. Missing or stale baskets are separate, visibly unranked, and cannot win. Customers can inspect one of these explicitly; its total remains labeled partial or outdated. No automatic substitutions were introduced.

On mobile, a persistent bottom bar keeps the current total accessible while browsing or scrolling the cart. Desktop browsing uses the basket sidebar. The pricing summary includes source publication time and the number of checked branches. Extra-stop cost and two-store splitting remain optional, inside purchase settings.

## Refresh and performance

- Product edits are debounced by 350 ms; superseded requests and late responses cannot overwrite newer state.
- Quantity changes and removals reprice immediately from checked unit prices when the product set and geographic scope are covered by the same quote.
- Adding an unchecked product, changing scope, refreshing explicitly or reaching the three-minute quote TTL fetches prices again. An open, visible app checks for expiry every 30 seconds and on return to the tab or network recovery.
- Loading and failures clear the displayed complete total rather than mislabeling a prior basket's total as the new one.
- Automatic comparison uses 24-branch pages and checks the full selected scope before returning a winner. Snapshot consistency and all-branch coverage checks remain enforced.
- The optional quadratic two-store calculation is skipped during normal automatic cart pricing and evaluated when requested.

“Automatic” does not mean prices are a real-time checkout or inventory feed. Sources still have their own publication times. No paid AI request is involved.

## Verification

- **79/79 Node tests passed**, including real official snapshot arithmetic, multi-page comparison, changed quantities switching the winning store, removal completing a previously partial branch, missing prices, weighted amounts, stale data, cache expiry, changed scope, debouncing, late replies, failed requests and retry.
- Build, JavaScript syntax and whitespace checks passed.
- Browser: adding flour without pressing Compare found a complete basket at ₪5.90; increasing its quantity to two immediately changed the row and total to ₪11.80.
- Selecting another branch changed the flour unit price to ₪6.90 and total to ₪13.80, with a visible link back to the cheapest basket.
- Adding one sugar package to two flour packages produced ₪17.30: ₪11.80 + ₪5.50, all from the same branch. The selected scope checked 65 Haifa branches (Wolt excluded), with 16 complete baskets for these exact products.
- Browser mobile frame: 390 px outer width; document client width and scroll width both 375 px, with no horizontal overflow. Light and dark themes were inspected. This is browser viewport QA, not a physical-device test.

The amounts above are measurements from the 2026-11-04 07:24 UTC published snapshot, not permanent advertised prices. They are shelf prices, excluding unverified promotions and delivery charges.
