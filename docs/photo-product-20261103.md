# Photo input and product identity verification

Implemented in the existing Superbasket repository on 2026-11-03.

## Automated checks

- 45 Node tests passed, including actual local-snapshot API tests, GTIN checksums, the user's OCR symbol fragments, line-specific diagnostics, quantity bounds, low-confidence review, packaging-text candidates, chain identity and explicit alternative semantics. A prepared burger containing a cut name is excluded from suggestions for that cut.
- 9 Python collector tests passed. Their intentionally simulated source failures are expected test output.
- JavaScript syntax, static build and `git diff --check` passed.

## Browser checks

At 390px width, exercised the real file chooser and the browser recognition libraries:

- Uploaded a generated EAN-13 test image for 7290107932080. The application decoded 07290107932080 and found the matching milk product in the real snapshot catalog.
- Uploaded a synthetic Hebrew label with `חלב תנובה`; OCR read it and returned catalog choices, without automatically selecting or adding one.
- Uploaded a test image containing symbol fragments. OCR output received per-line feedback and required correction or an explicit choice to continue with readable lines.
- Entered a mixed list with milk quantity 2, the reported symbol fragment and coffee quantity 100. The UI retained the valid row, explained each invalid row, blocked the ordinary continue action and allowed the explicit valid-only action.
- Opened the reported `shufersal:7290000913636` product. Its label explains the retailer-scoped weighted identity and checks only Shufersal branches. Other-chain alternatives are separately selectable; opening one performs a new local price lookup and does not add it to the basket.
- The product sheet fit the 390px viewport without horizontal overflow.

Local snapshot counts are older than production and are not claims about current nationwide coverage. Recognition tests used synthetic QA fixtures, not a promise of accuracy on arbitrary packaging, handwriting or blurred photos. Images are not uploaded to the server for recognition. Visual-only recognition, complete product-image coverage and automatic retailer-cart transfer are not implemented.

## Production verification

The first release was deployed READY on Vercel (`399c82b`) and its GitHub verification workflow succeeded (run 41639758137). The production product query for the reported Shufersal item checked all 23 relevant Haifa branches and returned 10 current prices, with zero source errors, against snapshot 2026-11-03T10:03:36.034917+00:00. Its exact comparison remains within Shufersal because the source identity is retailer-scoped. The separate alternatives endpoint returned 24 national suggestions from multiple other chains. Opening the application in a 390px frame showed the updated scope explanation and alternative selection flow.

The live production site also accepted the EAN-13 image through its file chooser and returned the exact catalog milk product 07290107932080. Production UI evidence: `product-alternatives-20261103.jpg`.
