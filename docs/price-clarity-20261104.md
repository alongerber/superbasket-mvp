# Partial basket price clarity — 2026-11-04

## Reported issue and scope of diagnosis

The user's screenshot shows 360.05 ILS for 7/8 priced lines and 53.00 ILS for 6/8. It also shows two 6/8 branches with very different amounts. These totals do not necessarily cover the same products. The screenshot does not contain all eight product IDs, quantities or approved alternatives, so the exact expensive line in that user's basket has not been established. No assertion is made that all source prices in that basket are correct.

## Changes

- Only complete current baskets use a large total, price ranking or saving badge.
- Partial cards show coverage, missing product names, and a subordinate, explicitly labeled sum of priced products only. The floating cart and main summary do not present this as a basket price.
- Every branch has a complete per-line breakdown of requested quantities, actual purchased alternatives/units, unit price, subtotal and missing prices.
- Pair comparison sums only lines priced in both branches. Equal coverage counts do not imply identical contents. Lines excluded from the difference remain visible; missing prices never become zero. Old price lists cannot produce a comparable difference.
- No source prices were divided, filled in, removed as presumed outliers or changed to force agreement.

## Additional quantity risk

The existing official-source snapshot contains barcode `07290000066332` named `אפרופו כלפ.36*50גרם` in Super Sapir (`super-sapir--163`, 7.90 ILS), while Shufersal (`shufersal--159`, 5.50 ILS) calls the same barcode `אפרופו 50 גרם`. Other chains report the single 50g consumer product. A multiplier in a description therefore cannot establish the sold package size.

Name-only multipliers and size ranges now produce unknown conversion and require an explicit manual ratio before substitution. Pending saved alternatives are surfaced for quantity review. Ordinary exact-barcode prices remain unchanged. This is an identified general risk; it is not claimed to be the proven source of the screenshot's 360.05 ILS.

## Verification

117 JavaScript tests passed before the final wording changes; the affected comparison/conversion tests were rerun afterwards. Tests include unlike 360.05/53.00 partial totals with a zero common-item difference, equal counts with different IDs, no shared prices, stale data exclusion, complete baskets, purchased package quantities and logistics multipliers. Syntax/build and whitespace checks passed.

Real-snapshot mobile QA at 390px compared a full three-line basket with an Osher Ad partial basket. The common two-line sums were 33.60 versus 30.80 ILS, a 2.80 ILS difference only on those lines; the unpriced meat line was visibly excluded. This verifies arithmetic and presentation for the observed snapshot, not stock or future prices. Individual branch detail and selecting a partial branch were exercised.
