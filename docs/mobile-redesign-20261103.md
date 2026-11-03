# Mobile interface redesign — 3 November 2026

Existing repository and production site retained. No paid services or permission changes.

## Delivered behavior

- Indigo/light and dark themes, four primary navigation destinations and a product-first home screen.
- Compact basket rows with a direct product-price action, quantities, save/share controls, a persistent comparison button and collapsed advanced options.
- One-tap product price sheet from search results, basket rows and basket comparison details.
- City, chain and explicit-store filtering; branch and chain presentation; actual publication timestamps; expanded address/history/price-target details.
- Product API pages source branches rather than silently stopping at 12. Each request has at most 24 branches. The UI requests 12 initially, then 24 per additional page. Local/selected scopes up to 120 branches continue automatically; national scope remains explicitly paged.
- Price summaries use only current, successfully checked branches. Missing prices, failed requests and incomplete comparisons remain visible. Old price lists cannot win the fresh-price summary. Snapshot changes restart pagination rather than mixing source generations.
- Basket comparison shows the first five complete/current results, expandable remaining results, and a separate expandable group for missing/old prices. A branch with zero matched items displays “חסר מחיר”, not a zero-price basket.
- Explicit quick branch selection, capped at 60, for the existing basket-engine limit. Exact city names restrict this picker to that city.
- Existing PWA icon and theme updated; shell cache version advanced. Existing saved baskets/preferences retained.
- Product images still require an exact Open Food Facts barcode match. Missing/broken images use a labeled category illustration, never a generated product photo.

## Verification

- `node --test tests/*.test.mjs`: **24 passed**, including real local official snapshots, exact price arithmetic, scope/chain filtering, pagination beyond 12 branches, invalid inputs, stale/future dates and nonpositive prices.
- `node --check public/app.js`, `node scripts/build.mjs`, `git diff --check`: passed.
- GitHub Actions application verification succeeded for implementation commit `79a7a088c8a8e412575a948cb2f86bf5da7463a0`: https://github.com/alongerber/superbasket-mvp/actions/runs/41624851317
- Vercel production deployment `dpl_5gYV8VrthAkmRSewPTs3kXVmp1uQ` reported READY; the public site served the new title, navigation and product cards.
- Live production product API for barcode `07290116936307`, Haifa: all **65** scoped branches checked across three pages, **50** prices, **15** missing, **0** download errors. Per-page times were 8.15 / 7.04 / 6.52 seconds. A separate Rami Levy filter returned three matching branch prices.
- Browser QA at 390×844: product search, product price sheet, chain grouping/filtering, add from details, quantity changes, comparison, saved basket and dark mode. The local official snapshot produced 28.80 ILS for two units at a 14.40 ILS branch price. Document width and scroll width were both 390 px on the cart.
- Product-price UI and live data were also opened on the deployed public site. Details are loaded progressively; full-city checks can take tens of seconds on the existing snapshot backend.

## Limits

This release changes presentation and product-price browsing. It does not complete national coverage, replace Git-backed snapshots with a managed database, implement promotion calculations or background Push, or verify camera/microphone/PWA installation on a physical phone. The browser QA uses a phone-width viewport, not a physical-device test.

The deployed mobile price sheet for barcode `07290107932080` completed **65/65** Haifa branches: **58** current prices and **7** missing. It displayed a checked minimum of **8.50 ILS** and a **3.00 ILS** difference between the checked branches. Both document width and scroll width were 390 px; the dialog had no horizontal overflow. A direct browser screenshot is saved as `product-prices-mobile-20261103.jpg`.
