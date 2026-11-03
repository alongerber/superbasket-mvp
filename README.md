# סליק / Superbasket

Existing production project: https://superbasket-mvp.vercel.app

## Application

Hebrew RTL mobile interface, indexed barcode/name search, explicit list resolution (up to 200 lines), quantities, complete-basket ranking and exact two-store split comparisons including a user-supplied extra-stop cost. Partial and stale baskets cannot win. Saved baskets, share links, dark mode, PWA shell, local activity and price targets. Published promotion conditions are visible but **not subtracted** until their rule semantics are verified. Voice input depends on browser support. Photo OCR loads pinned Tesseract.js in the browser and requires review.

## Product-first interface (November 2026)

Indigo mobile UI with four primary tabs, compact cart rows, a persistent compare action and collapsed advanced options. Product cards and basket rows open a price sheet in one tap. `/api/product` supports city/chain/explicit-store filters and stable pagination (up to 24 source branches per request), replacing the previous silent 12-branch limit. City/selected scopes with up to 120 branches load subsequent pages automatically; national searches are explicitly paged. Fresh-price summaries refer only to checked branches. Failed/missing sources and partial coverage remain visible. Chain grouping retains the underlying branch prices and publication times. Basket results separate complete, current baskets from incomplete or old price lists.

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

The shopping panel copies names, quantities and barcodes and links to the official Rami Levy, Shufersal and Victory stores. It explicitly does **not** populate their carts, collect payment, reserve stock or place orders. Online prices/delivery can differ from branch shelf prices. Embedded checkout and automatic cart transfer remain unimplemented pending a verified retailer integration.
