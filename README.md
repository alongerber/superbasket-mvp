# מי סופר? · ME SUPER / Superbasket

Existing production project: https://superbasket-mvp.vercel.app

## Application

Hebrew RTL mobile interface, indexed barcode/name search, explicit list resolution (up to 200 lines), quantities, complete-basket ranking and exact two-store split comparisons including a user-supplied extra-stop cost. Partial and stale baskets cannot win. Saved baskets, share links, dark mode, PWA shell, local activity and price targets. Published promotion conditions are visible but **not subtracted** until their rule semantics are verified. Voice input depends on browser support. Photo OCR loads pinned Tesseract.js in the browser and requires review.

## Automatic shopping cart (2026-11-04)

The basket automatically shows its cheapest complete branch total and that branch's unit and line prices. Adding items or changing quantities refreshes pricing; customers can switch to another branch in a price-sorted picker. Missing/stale baskets never win. A three-minute in-memory quote allows instant quantity/removal updates; new products and changed scope trigger a fresh, fully paged comparison. Mobile keeps the total in a persistent bottom bar. See [implementation and verification](docs/live-basket-20261104.md).

## Product-first interface (November 2026)

Warm cream, ink and coral mobile UI with five primary tabs, compact cart rows, a persistent priced basket and collapsed advanced options. Product cards and basket rows open a price sheet in one tap. `/api/product` supports city/chain/explicit-store filters and stable pagination (up to 24 source branches per request), replacing the previous silent 12-branch limit. City/selected scopes with up to 120 branches load subsequent pages automatically; national searches are explicitly paged. Fresh-price summaries refer only to checked branches. Failed/missing sources and partial coverage remain visible. Chain grouping retains the underlying branch prices and publication times. Basket results separate complete, current baskets from incomplete or old price lists.

## Data architecture

`scripts/fetch_prices.py` probes every chain in the pinned `israeli-prices` registry (32 entries). It downloads official Stores, PriceFull, cumulative Price updates and PromoFull files. It validates branch/chain IDs, retains the original filename/publication time/hash, and preserves the last successful branch on failure. Weighted/internal IDs are namespaced to their chain; GTIN-14 is used for packaged goods. Zero/nonpositive prices are not eligible for comparisons.

Durable snapshots are stored on the existing repository's separate `price-data` branch. Each branch has an immutable SHA-256-addressed gzip object, with current prices, raw promotion rules and up to 90 observed price changes per product. An SQLite FTS5 catalog indexes products and store metadata. Vercel functions download and verify the catalog and only the branch objects needed for a comparison; prices are not bundled in deployments. Updates to the data branch do not require application rebuilds. Municipal codes use the official Population Authority dataset, with source attribution in `data/cities.json`.

This is a working sharded snapshot architecture, **not a provisioned managed PostgreSQL service**. Git history and traffic will grow as nationwide updates accumulate; this hosting arrangement is a bootstrap and is not a long-term high-traffic database SLA. No paid database or storage service has been activated. A managed database/object-storage migration will require a confirmed free entitlement or explicit spending approval.

## Scheduled collection and monitoring

`.github/workflows/prices.yml` runs every two hours and on collector changes. It collects on an Ubuntu GitHub Actions runner, validates checksums/counts, and atomically commits a generation on `price-data`. Failed downloads remain visible per source/store in `/api/status` and the app's coverage screen. GitHub Actions records execution failures and a measured coverage summary. Scheduled Actions can be delayed by the platform; a schedule is not proof that a particular refresh succeeded.

## Run and verify

Node >=24 (native SQLite) and Python >=3.10.

```sh
pip install -r scripts/requirements.txt
python scripts/fetch_prices.py --workers 8
npm test
npm run dev
```

Set `DATA_DIR` to a local snapshot directory for API tests; production reads the public `price-data` branch. `python scripts/validate_data.py` validates every currently referenced object. `python scripts/coverage_summary.py` prints measured coverage. No credentials are stored in source.

## Intentional limits

- A published price is not a stock guarantee; missing means no eligible price in that branch's published data.
- Shelf prices only. Coupons, clubs, mixed bundles and multi-buy promotions are displayed for review, not applied automatically.
- Source files over 36 hours old are excluded from recommendations. The UI shows the actual per-branch publication time, not just collector time.
- Wolt Market requires explicit inclusion, excludes delivery fees, and is not treated as the retailer universe on Wolt.
- History starts with the first observed source snapshot; no historical prices are invented.
- Alerts are checked while opening the app, not background Push. Preferences and baskets are device-local.
- Photos are shown only after an exact barcode match in Open Food Facts; missing images use a labeled generic symbol. Images: CC BY-SA; price records come from retailer transparency files.
- UI/API errors never generate sample prices as a fallback.

Collection has per-chain time/failure limits and a global deadline before the CI hard timeout. Push-triggered verification runs collect for 3 minutes; scheduled/manual runs collect for up to 40 minutes, then publish verified checkpoints. The status API reports running, finished, time-budget, failed or interrupted collection separately from source freshness.

## City comparison and shopping handoff (2026-11-03)

`POST /api/basket` now uses stable branch pagination: `offset` (default 0), `limit` (default 12, max 24), and optional `as_of` snapshot guard. Responses include `total_stores`, `checked_stores`, `next_offset`, and `partial`. **API consumers must aggregate every page before presenting a city-wide winner.** The browser does this automatically, displays progress, preserves errors, and computes the global best and two-store split using the shared integer-money module. City comparisons have no 60-branch cutoff; manual selection remains bounded to 60. Cancellation and any cart/scope change invalidate in-flight results.

Two-store shopping is opt-in. The time/fuel amount is a user estimate for the additional stop, not a calculated route. Results separately show merchandise subtotal, extra-stop amount, total and net savings (including when the second store stops being worthwhile). The trip to the first store is not priced.

Images now load for visible products throughout the result list rather than only the first six. Exact-barcode photographs are cached in the browser for up to seven days; temporary upstream errors/throttling are retried and are never stored as confirmed missing images. Source and license links are available in the product sheet. The free Open Food Facts source does not provide complete coverage; the enrichment search returned HTTP 503 during this verification. GS1's manufacturer-maintained image catalog is a potential additional source, but access and reuse terms have not been obtained. No paid image service was activated.

The shopping panel copies names, quantities and barcodes and links to the official Rami Levy, Shufersal and Victory stores. It explicitly does **not** populate their carts, collect payment, reserve stock or place orders. Online prices/delivery can differ from branch shelf prices. Embedded checkout and automatic cart transfer remain unimplemented pending a verified retailer integration. See [the documented transfer path and commercial blocker](docs/cart-transfer-integration.md).

## Photo input and retailer-specific products

The camera control now separates shopping-list photos from product photos. Product photos are searched through a checksum-validated barcode (native detector or pinned ZXing Browser 0.1.5) or readable packaging text (pinned Tesseract.js 6.0.1, Hebrew and English). All image processing stays in the browser; recognized search text goes to this app's catalog. This is not visual-only product recognition. The user reviews matches before adding a product. CDN/language downloads, image clarity and browser capabilities affect recognition.

List diagnostics retain line numbers, offending text and individual reasons for unreadable fragments, invalid barcodes and invalid quantities. Low-confidence OCR requires review. Valid lines may proceed only after an explicit choice. A readable query with no catalog match has a different explanation from a failed catalog request.

Chain-scoped product IDs (especially weighted goods) are labeled as retailer codes, not global barcodes. Their price requests check that chain's branches. `GET /api/catalog?alternatives_for=PRODUCT_ID` offers explicitly unverified alternatives from other chains, preserving the sale unit and flagging known description differences. Suggestions are national; their local prices are checked after selection. No alternative is merged into an exact comparison or added automatically.

## ME SUPER categories and shopping planner

The bilingual brand is **מי סופר? · ME SUPER**, with the signature **מי סופר? בשביל זה יש ME.** Existing local basket, alert and saved-list storage keys remain unchanged. The PWA icon combines a shopping bag with a question mark.

`public/taxonomy.mjs` defines retail departments and nested categories, including cheese types, beef cuts, poultry and fish. `/api/categories` returns measured product counts. `/api/catalog?category=...` provides stable scoped search and pagination. Classification is inferred from price-file names, not supplied by retailers; unknown items remain in an explicit unsorted category. Counts represent national catalog entries, not physical stock or unique global products for retailer-scoped IDs.

The planner supports events and pasted recipes, total guest counts, children, vegetarians, desired budget, pantry items and follow-up changes. It only suggests ingredients. `/api/planner` then searches real catalog records. Customers choose each exact product and confirm the sale quantity before adding it. Only explicit package size or weighted-sale metadata permits a suggested conversion; ambiguous sizes require manual review. Prices remain the existing exact-product comparison engine's responsibility. Saved planning state is device-local.

AI planning uses the Anthropic Messages API directly from the server, with `ANTHROPIC_API_KEY` stored as a Vercel Production Secret. The fixed model is `claude-haiku-5-5`, with low effort, a 4,500-token output limit, bounded user input and validated structured JSON. There is no automatic retry, model fallback, external tool or Gateway dependency. Generated ingredients are matched to real catalog records; model-provided product IDs, prices and stock are never trusted. The browser never receives the key. Requests are sent to Anthropic, which is disclosed beside the AI button.

**A key alone does not enable paid generation.** `AI_USAGE_MODE` defaults to off. `GET /api/planner` checks the model metadata endpoint (no inference), caches the result, and separately reports credentials/access versus spending permission. In `testing` mode, generation additionally requires the server's secret `AI_TEST_TOKEN` in `x-ai-test-token` and a future ISO `AI_TEST_EXPIRES_AT`; public controls stay hidden. Only `public` mode exposes generation to visitors, after approved live tests. The request limit is per function instance, **not a global monetary spending cap**. Confirm an account/workspace spending limit before opening to public traffic. If an account-wide key requires workspace selection, set `ANTHROPIC_WORKSPACE_ID`; single-workspace keys need only the key.

Six deterministic plans and a conservative line-based recipe parser remain available when AI is unavailable; the interface explicitly labels them as **without AI**. They do not interpret free-form changes, guarantee dietary safety, guarantee a budget, or silently rescale pasted recipe quantities.

Live verification (2026-11-04): five owner-authorized direct Claude requests completed successfully, including Hebrew event planning, recipe scaling from two to six servings, and a vegan follow-up. Tests exposed and corrected excessive seasoning amounts, unwanted equipment, unrelated recipe context and fresh-produce candidate ranking. Reported token usage estimates the total at $0.0042094; this is not a billing statement. See [the verification record](docs/claude-live-verification-20261104.md). Public paid generation remains off because the approval covered testing only. No paid inference is part of the offline test suite. The old free Gateway route was removed after its customer-verification rejection.
