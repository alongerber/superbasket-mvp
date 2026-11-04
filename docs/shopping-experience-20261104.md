# Shopping experience — 2026-11-04

## Price visibility fix

The previous cart selected `results.best` only. That field is intentionally null when no branch has a complete fresh basket, so all item prices and the partial subtotal were hidden. `recommendStore` now selects the cheapest complete fresh basket, or the fresh branch with maximum product coverage when no complete basket exists. Partial baskets are never ranked as a cheap complete basket. Coverage ties are deterministic, not a comparison of different missing-product sets.

The cart displays the selected branch's subtotal, unit price × quantity, coverage and publication time. Missing-product diagnostics distinguish prices found in other checked branches from no current price found in the selected scope. Substitutions require explicit selection.

## Requested upgrades

| # | Feature | Status |
|---|---|---|
| 1 | Unified shopping entry | Search, multiline paste, list, photo and voice under “מה קונים?” |
| 2 | Batch list review | Exact names/barcodes preselected for review; ambiguous lines expanded; one explicit batch apply; pending lines retained |
| 3 | Regional product cards | Current regional minima computed from all checked branches, with chain and source time; no national-price flash |
| 4 | Decision-oriented cart | Automatic full/partial recommendation and item-specific missing-price actions |
| 5 | Buy again | New history records preserve actual products/quantities; restore requires confirmation and reprices |
| 6 | Family synchronization | BLOCKED: no persistent database connected to the project. Vercel metadata lists Neon Free and Upstash installations, but neither is connected; available connector cannot provision/connect these, and dashboard requires login. No fake local-only synchronization shipped |
| 7 | ME inside basket | Built-in people scaling, pantry/remove review, meat-department selection, existing meal planner entry. Full conversational AI remains off under existing spending guard |
| 8 | In-store mode | Department checklist, persistent quantity-aware checkoffs, explicit reset |
| 9 | Regular basket alerts | Device-local threshold watch, same products/quantities/scope, complete current baskets only; checks while app opens/runs. Background push NOT enabled |
| 10 | Result sharing | Actual price/coverage/region/time, actual comparison to next complete branch when cheaper, image export/native file sharing where supported, validated link recomputes prices |

## Verification

- Automated regression suite, static asset build, JS syntax and diff checks.
- Mobile 390×844 UI on real Haifa data: 65 branches; flour ×4, sugar ×2, white cheese ×1, rare caramel Apropo ×1 → no full basket; automatic 40.90 ILS for 3/4 products. Missing item has current prices in 2 other branches.
- Explicit people-scale approval doubled those quantities: partial 81.80 ILS. Removing missing item immediately yielded a complete 81.80 ILS basket in 15 complete branches.
- Batch: two exact barcode matches selected, cheese required an explicit package choice; unknown phrase identified specifically, corrected to exact barcode, all four applied together.
- Shopping-mode check persisted across closing/reopening. ME preview showed before/after quantities and made no changes until approval.
- Sharing preview and copied payload correctly marked partial total and included recomputation link. No outbound message sent.
- Regional default cards showed Rami Levy prices, including 4.20 ILS for the first result; source time displayed.
- Caught and fixed regional-controller default-clock error and white sugar misclassification in dairy during mobile QA.

No paid service or public AI inference was activated. Historical records created before this release lack item snapshots and cannot supply buy-again lists.
