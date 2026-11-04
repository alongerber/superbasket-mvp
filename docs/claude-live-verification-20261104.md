# Direct Claude verification — 2026-11-04

The owner authorized up to US$1 from the existing Anthropic balance for real tests only. Five inference requests reached the production API using a temporary secret header. Public generation remained disabled throughout. No credits, subscriptions or services were purchased.

## Observed results

| Request | HTTP | Seconds | Catalog candidates before the ranking correction |
| --- | --- | --- | --- |
| BBQ for eight total guests, including two children and two vegetarians | 200 | 18.26 | 21 of 23 ingredients |
| Pancake recipe scaled from two to six servings | 200 | 13.33 | 5 of 5 |
| BBQ repeated after prompt corrections | 200 | 13.96 | 12 of 13 |
| Recipe repeated after context correction | 200 | 11.47 | 5 of 5 |
| Follow-up: all eight guests vegan, replace chicken with 1.2 kg tofu | 200 | 16.05 | 11 of 12 |

These are synthetic shopping requests against the real Claude service and real price catalog. Candidate counts do not assert equivalence, dietary suitability, stock or approval by a shopper. Firm tofu and prepared vegetable skewers had no candidate; they remained unresolved rather than being assigned an invented product.

The recipe returned exactly 600 g flour, 750 ml milk, three eggs, 60 g sugar and 60 ml oil. Five explicit package sizes from returned catalog records converted to one sale package each. The vegan follow-up removed chicken and prepared skewers, added 1,200 g tofu, and preserved the requested guest total.

## Corrections driven by these tests

- The initial event response used excessive seasoning amounts and added unsolicited equipment. Instructions now ask for meal-use quantities, at most 16 ingredients, and equipment only on request. The repeated BBQ response used 60 ml oil and one teaspoon each of salt and paprika, with no equipment.
- Recipe mode inherited an unrelated BBQ preset. The UI and server now omit that event context; the repeat recipe response stayed on topic.
- Candidate ranking put packaged preserves, salads and seasonings ahead of fresh vegetables expressed as a count. Produce matching now examines up to 80 candidates, prefers exact fresh names and filters unrequested processed forms. Selection and sale-weight confirmation remain mandatory.

## Validation and limits

71 automated Node tests, the build check, JavaScript syntax checks and whitespace checks passed. The tests include disabled spending, expired or invalid QA tokens, input limits, provider failures, no retries, package conversion and fresh-produce ranking. They do not spend API credit.

A real flour product lookup checked all 66 branches in Haifa over three pages: 16 returned a price, 50 had no price for that exact product, and no branch fetch failed. The response included publication times and `next_offset: null`. A branch checked is not a branch with a matching price.

Total estimated inference cost: **US$0.0042094**, calculated from the five responses' token usage and the published Haiku 5.5 rates of $0.10 per million input tokens and $0.50 per million output tokens for these small prompts. This is an estimate, not a verified billing statement. [Official model pricing](https://platform.claude.com/docs/en/models/haiku-5-5/overview).

Production configuration is returned to `AI_USAGE_MODE=off`; the temporary token is rotated and its configured expiry is in the past. Old immutable QA deployments retain their original short expiry. Public paid operation still requires an approved ongoing budget and an account/workspace spending limit: the existing per-instance rate limit is not a global monetary cap.

The live inference checks were API tests. They do not establish unlimited language reliability, dietary safety, a physical-phone AI flow, complete national coverage or direct retailer checkout. All shoppers must still confirm exact products and quantities.

Sanitized measurements and selected real responses are in [the evidence JSON](claude-live-evidence-20261104.json). It contains no API key, QA token or customer data.
