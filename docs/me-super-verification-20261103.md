# ME SUPER release verification — 2026-11-03

Production: https://superbasket-mvp.vercel.app/

Application commit: `6b9f31ba748dcaf0f6c51c9d97608b57af4c603a`.
Vercel deployment: `dpl_7Q3fbyGfY6WQNtmCP7uVS12eowvt`, READY.
GitHub verification run: `41652530687`, success.

## Shipped

- Bilingual brand: מי סופר? · ME SUPER. Signature: מי סופר? בשביל זה יש ME.
- Cream, ink and coral palette, dark-mode styling, question-mark shopping-bag PWA icon, five navigation destinations. Existing user-storage namespaces were preserved.
- 16 retail departments plus an explicit uncategorized department. 99 leaf categories including the uncategorized leaf, with deeper cheese, beef, poultry and fish navigation. Search and product paging stay within the chosen category.
- Six structured meal plans with total guests, child portions and vegetarian counts, and a conservative recipe-ingredient parser. Both are explicitly labeled without AI.
- Real catalog candidate selection, manual confirmation of every purchase quantity, pantry checkboxes, per-product price access and selected-item cart transfer. Unsupported package-size conversions remain manual.

## Executed checks

- `npm test`: **61/61 passed**, including local real-snapshot API tests for catalog search, category counts, paging after item 5,000, scoped search, exact product IDs and planner candidates.
- Python collector/control tests: **9/9 passed**.
- Build check and JavaScript syntax checks passed; `git diff --check` passed.
- Browser: 390px mobile viewport inside the managed preview, light and dark mode, category → cheese type → products, recipe input, structured barbecue plan, pantry selection, explicit 0.72kg confirmation and cart addition. Mobile category layout showed no horizontal overflow (body width 375px, scroll width 375px, inside a 390px frame including scrollbar).
- Production browser: pasted a three-ingredient recipe, matched a real 500g Barilla product, saw a suggested one-package purchase requiring confirmation, and opened the existing live branch-price sheet. It checked 65 Haifa-scope branches, found 45 current prices, and displayed multiple retailers (including Osher Ad, Good Pharm, Tiv Taam, Rami Levy, Shufersal and others). This is evidence about that product and scope, not national coverage or stock.
- Production capability check: AI unavailable notice is visible, no active free-form AI submission or misleading budget controls are offered.
- Screenshots: [categories](me-super-categories-20261103.jpg), [planner](me-super-planner-20261103.jpg).

Browser testing used a mobile-width viewport; no physical Android/iOS device test was performed.

## Measured classification coverage

Snapshot generated at `2026-11-03T10:03:36.034917+00:00`:

- Catalog records: **158,421**.
- Classified records: **102,397**.
- Explicitly uncategorized records: **56,024**.
- Department count sum: **158,421** (no silent omission).

Retailer-specific IDs are separate catalog records. Inferred categories may be wrong: price-file names are abbreviated and do not provide authoritative retail category metadata. Unknown records remain searchable and visible under עוד מוצרים. Full classification is not claimed.

## AI blocker and cost controls

An actual production request to `nvidia/nemotron-3.5-lightning-free` was rejected by Vercel AI Gateway with HTTP **403**, code **`customer_verification_required`**. Request-scoped OIDC was present. No successful model-generated shopping plan was obtained; Hebrew output quality and free-form interpretation are therefore not claimed.

The official Vercel plugin reference says a valid payment method is required to unlock free Gateway usage: https://github.com/vercel/vercel-plugin/blob/main/skills/ai-gateway/references/spend-observability.md

No payment method, credit purchase, auto-top-up, persistent API key or access-permission change was made. The model call verifies the official endpoint's pricing is entirely zero before each request and restricts routing to NVIDIA, with no fallback models. This is a preflight check, not an atomic price guarantee.

After the owner resolves Vercel's customer verification, test an event, recipe and follow-up against `/api/planner` and verify returned Hebrew quantities and real catalog matching. Only after those succeed should `public/planner-capabilities.mjs` be marked ready. The current release keeps free-form AI controls hidden and the working structured planner clearly labeled without AI.
