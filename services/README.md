# TrustRail off-chain services

Off-chain tools for NGO and attestor actors to interact with `TrancheVault` without exposing raw evidence to the chain.

## What's here

- `proof.ts` — `buildProofHash()` (canonical SHA-256 over a proof payload), shared chain helpers (`submitProof`, `confirmProof`, `claimTranche`, `reclaimExpired`), `notifyProofSubmitted()` stub, and the demo scenarios.
- `submit-proof.ts` — NGO-side CLI: `tsx services/submit-proof.ts <campaignId> <trancheIndex> <photoRef> <lat> <lon> <recipientCount>` (also `npm run submit-proof -- <args>`).
- `confirm.ts` — attestor-side CLI: `tsx services/confirm.ts <campaignId> <trancheIndex> [attestorKey]` (also `npm run confirm -- <args>`).
- `demo.ts` — demo runner: `tsx services/demo.ts [1|2|all]` (also `npm run demo -- [1|2|all]`).
- `test/proof.test.ts` — 6 unit tests for the hash function (deterministic, sensitive to all input fields).
- `test/submit-confirm.test.ts` — mocked-Contract tests for the submit/confirm path + notify stub + onchain decimals helper.

## What this is not (v1)

- **Not** a photo/GPS authenticity verifier. Attestors review evidence off-chain before confirming onchain. The contract enforces *process*, attestors verify *content*.
- **Not** a recipient KYC system. End recipients are not identified onchain.
- **Not** a fiat off-ramp. Funds settle in USDC.

## Honesty rules

No fabricated hashes. No synthetic data labeled as real. The demo proof payloads use clearly synthetic `synthetic://photo-N.jpg` refs and approximate lat/lon values; do not present them as real field data.
