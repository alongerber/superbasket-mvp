# סליק / Superbasket

Existing production project: https://superbasket-mvp.vercel.app

## Application

Hebrew RTL mobile interface, indexed barcode/name search, explicit list resolution (up to 200 lines), quantities, complete-basket ranking and exact two-store split comparisons including a user-supplied extra-stop cost. Partial and stale baskets cannot win. Saved baskets, share links, dark mode, PWA shell, local activity and price targets. Published promotion conditions are visible but **not subtracted** until their rule semantics are verified. Voice input depends on browser support. Photo OCR loads pinned Tesseract.js in the browser and requires review.

## Data architecture

`scripts/fetch_prices.py` probes every chain in the pinned `israeli-prices` registry (32 entries). It downloads official Stores, PriceFull, cumulative Price updates and PromoFull files. It validates branch/chain IDs, retains the original filename/publication time/hash, and preserves the last successful branch on failure. Weighted/internal IDs are namespaced to their chain; GTIN-14 is used for packaged goods. Zero/nonpositive prices are not eligible for comparisons.

Durable snapshots are stored on the existing repository's separate `price-data` branch. Each branch has an immutable SHA-256-addressed gzip object, with current prices, raw promotion rules and up to 90 observed price changes per product. An SQLite FTS5 catalog indexes products and store metadata. Vercel functions download and verify the catalog and only the branch objects needed for a comparison; prices are not bundled in deployments. Updates to the data branch do not require application rebuilds. Municipal codes use the official Population Authority dataset, with source attribution in `data/cities.json`.

This is a working sharded snapshot architecture, **not a provisioned managed PostgreSQL service**. Git history and traffic will grow as nationwide updates accumulate; this hosting arrangement is a bootstrap and is not a long-term high-traffic database SLA. No paid database or storage service has been activated. A managed database/object-storage migration will require a confirmed free entitlement or explicit spending approval.

## Scheduled collection and monitoring

`.github/workflows/prices.yml` runs every three hours and on collector changes. It collects on an Ubuntu GitHub Actions runner, validates checksums/counts, and atomically commits a generation on `price-data`. Failed downloads remain visible per source/store in `/api/status` and the app's coverage screen. GitHub Actions records execution failures and a measured coverage summary. Scheduled Actions can be delayed by the platform; a schedule is not proof that a particular refresh succeeded.

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
