# Comparison and shopping follow-up — 2026-11-03

Changes: complete city basket pagination, cancellation and snapshot consistency; opt-in second-store cost breakdown; transparent online-shopping handoff; visible-product image loading, persistent positive cache and transient-failure handling.

Verification before deployment:
- 33 existing/new Node tests passed, including a synthetic 73-branch regression where the winning branch is after the old limit and the cheapest pair spans page boundaries. Synthetic cases are test fixtures only, never published as prices.
- An additional real-snapshot basket API test passed: every page checked, quantities correct and changed snapshot rejected with HTTP 409 (34 total tests).
- Build, JavaScript syntax and whitespace checks passed.
- Browser at 390px: actual local snapshot comparison finished 32/32 eligible Haifa branches; a two-unit milk basket cost ILS 28.80 at the lowest checked complete branch.
- Second-store opt-in, presets and dark/light layout verified.
- Shopping list copy fallback opened the selectable list when clipboard was unavailable in the local iframe. Official destination URLs verified by search/retrieval; no order, login, payment or merchant-cart modification performed.

Limits: image coverage remains incomplete, Open Food Facts enrichment request returned 503, no GS1 access or supplier media agreement is connected. Shopping is a retailer handoff, not integrated checkout or automatic cart transfer. No paid services or new permissions were enabled.

Sources:
- https://www.gs1il.org/digital-item-catalog-for-retailers/
- https://openfoodfacts.github.io/openfoodfacts-server/api/
- https://www.rami-levy.co.il/he/online-shopping
- https://www.shufersal.co.il/online/
- https://ir.victory.co.il/en/company-profile/

Production verification:
- Commit ebcd88338ab7eb9d732e3922e4f84adbed376a3a deployed READY. CI run 41632009683 succeeded.
- Live basket API checked all 64 eligible Haifa branches (Wolt excluded), six pages, zero download errors. Two units of barcode 07290107932080 yielded ILS 17.00 at the lowest checked complete store. One run took 11.616 seconds.
- Live browser at 390px completed 64/64 and displayed ILS 8.50 for one unit. Screenshot: city-comparison-20261103.jpg.
- The production image endpoint resolved that same exact barcode to an attributed OFF image URL; this does not establish full image coverage or guarantee the image host's availability.
- Additional local real-data UI check: barcodes 00000072917367 and 08076800195057 cost ILS 11.90 in one store versus ILS 9.50 across two. Adding an estimated ILS 20 showed ILS 29.50 and correctly advised one store; changing the estimate to zero immediately showed ILS 2.40 savings. No horizontal overflow; no app.js console errors were recorded.
- Added exact GTIN-8 normalization and regression coverage (35 total tests).
- Direct retrieval of the selected OFF thumbnail also returned HTTP 503 in this environment. The UI retained its labeled illustration; no complete photo coverage is claimed.
