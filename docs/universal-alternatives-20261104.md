# Universal approved alternatives — 2026-11-04

## Scope

The workflow is available for all physical catalog IDs, including products without a dedicated taxonomy rule. It is not confined to the five existing meat-type definitions. Original IDs remain exact unless a customer explicitly approves alternatives; original products are still considered after approval.

`GET /api/equivalents` returns source metadata, candidate pagination, detected differences and unit conversion. Suggestions use source-name inference, not certified ingredients or equivalence. Strict filters may yield no matches; manual catalog search and explicit relaxation remain available. Up to 20 alternatives per line and 200 basket lines are supported.

The basket API resolves approved IDs against the current catalog and computes conversions on the server. Unknown package size/dimension requires a user-supplied `manual_ratio`. Mass and volume are never silently equated. Whole packages round up before pricing. Weighted automatic alternatives require a kilogram source unit in the actual branch record. Cheapest means lowest payable subtotal among the approved options, within the selected branch scope and fresh source files.

No product is selected, removed or replaced merely by opening the editor. Approved choices are persisted, shared and used by live comparisons, watches and two-store splits. The purchased name and quantity are used by shopping mode and copied checkout lists. Changing quantity, product or branch invalidates shopping check marks. Product catalog cards do not mislabel an alternative's price as the original product's price.

## Verification

- 112 JavaScript tests passed, including API integration against real snapshots, basket consistency, rounding, quantity invalidation, weighted units, manual ratios, storage/share and split decisions.
- 10 Python collector/metadata tests passed after installing the repository's pinned requirements.
- Build, JavaScript syntax and `git diff --check` passed.
- Catalog audit: snapshot `2026-11-04T07:24:20.235483+00:00`, 159,371 product IDs, all accepted by the universal workflow; 99 represented leaf categories. Explicit package/weighted measures were detected for 61,597 entries. This is an inference count, not a claim of audited packaging for every product.
- Real catalog queries covered 20 product families including dairy, rice, pasta, produce, cleaning, shampoo, diapers, paper, eggs, coffee, water, flour, batteries and pet food. Strict queries returned no candidates for some truncated or tightly specified products; the UI explains this and allows reviewed broader search.
- 14 synthetic semantic cases verify percentages, lactose labels, rice varieties, coffee types, oil types, battery size, diaper size, formula stage, cleaning use, flour versus semolina, pet species, produce and hair product purpose. They validate rules, not every possible description.
- Mobile UI at 390 × 844: added and approved rice alternatives; total updated from 185.08 to 195.98 ILS when source quantity changed from one to two in a real three-line Haifa basket. These are observed test results, not evergreen prices. Reopening restored choices. An unknown-size candidate could not be selected without a manual ratio; entering a ratio updated purchased quantities and enabled explicit approval. Whole-basket review opened the next eligible catalog line.

## Metadata and limits

Collector aggregation now prefers a fuller official name for the same exact product ID and fills missing manufacturer metadata when another official branch record provides it. It retains counts and price minima/maxima. The update takes effect when a complete collector export is next published; no partial local catalog replaces national data.

Catalog descriptions may be truncated or inconsistent. Suggested similarity is never proof of nutritional equivalence, allergens, dietary safety, certification or physical stock. Some products will require manual search and quantity decisions. There is no guaranteed substitute for every item. Promotions, delivery charges and automatic retailer cart transfer remain outside this change. No AI inference or paid service was enabled.
