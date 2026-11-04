# Approved shopping types across chains — 4 November 2026

A shopper can choose a meat type once and compare a complete basket across retailer-specific product codes. This is a description-based type match, not a claim that brands, origin, aging or physical stock are identical.

## Implemented behavior

- Type comparisons initially group prices by chain in expandable cards, so chains with many branches do not bury other retailers. The summary reports both chain and branch counts.
- Separate search suggestions for ribeye, sirloin, beef fillet, chicken breast and chicken thigh, when matching catalog rows exist.
- Explicit selection of fresh/frozen/thawed, bone wording, optional kashrut stated in the source name, and kilograms.
- Only weighted records with a declared kilogram unit and a positive integer-agorot price participate. Unknown, per-unit or 100g units are excluded rather than converted speculatively.
- Prepared products, contradictory state/bone descriptions and ambiguous multiple certifications are excluded. A missing freshness description never implies fresh. In particular, the Hebrew word for ribeye contains the substring “fresh”; token matching prevents this false positive.
- Versioned `need:v1-…` IDs encode the user's choice. Each branch picks its cheapest conforming product. API results keep both the requested ID and the actual matched source ID/name/unit/attributes.
- Exact GTINs and retailer IDs remain exact. Moving an existing item to a type comparison requires explicit approval and preserves quantity. Editing an existing type replaces that line after approval rather than duplicating it.
- Basket totals, branch switching, fractional weights, partial-basket handling and two-store split calculations use the matched line subtotal. Product history belongs to the concrete product selected in that branch, not a synthetic cross-product series.
- Saved/shared baskets retain the type ID; imports reconstruct the canonical name. Cache version is bumped to load the new shared modules.

## Measured checks

Snapshot generation: `2026-11-04T07:24:20.235483+00:00`.

- 65 non-Wolt Haifa branch snapshots checked, zero read/checksum failures.
- Fresh ribeye with no bone wording and no kashrut filter matched 19 branches across King Store, Shufersal, Stop Market and Tiv Taam.
- A basket of 1.25 kg of that type plus two units of exact GTIN `07290000066332` had 19 complete branch results. King Store Kebabir (`king-store--14`) totaled 17,418 agorot: round(12,990 × 1.25) + 590 × 2.
- Branch switching in a 390×844 mobile viewport changed the basket's concrete meat name, unit price and subtotal together. Shufersal branch 159 displayed 23,625 + 1,100 = 24,725 agorot for the same requested quantities.
- The product sheet checked all 66 Haifa sources (including Wolt) and exposed the missing matches separately. Changing to frozen/halak preserved weight and excluded fresh results.
- Confirmed an exact Shufersal frozen/halak product was retained until the approval action, then replaced by the corresponding type ID with its quantity intact.
- Automated suite: 98 tests, including real-snapshot catalog/product/basket API paging, cross-chain matches, strict exact-product identity, fractional arithmetic, source history and shared-basket restoration. Static build and JavaScript syntax checks passed.

## Limits

There is no live-stock integration. “No matching price” is not “out of stock.” Only source descriptions support these matches; they do not verify kashrut certificates. Products without an explicit state or reliable kilogram unit remain outside the automatic pool. Observed excluded Haifa records include Fresh Market with `לא ידוע` units and Osher Ad with `יחידה` units; source semantics need verification before including them. Generic matching is limited to the five listed meat families. Bulk-list and recipe matching continue to require their existing individual product choices. Public AI remains disabled; no paid service was activated.
