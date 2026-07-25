# TrustRail off-chain services

Off-chain tools for NGO and attestor actors to interact with `TrancheVault` without exposing raw evidence to the chain.

## What's here

- `proof.ts` — `buildProofHash()` (canonical SHA-256 over a proof payload), shared chain helpers (`submitProof`, `confirmProof`, `claimTranche`, `reclaimExpired`), and the demo CLI.
- `test/proof.test.ts` — 6 unit tests for the hash function (deterministic, sensitive to all input fields).

## What this is not (v1)

- **Not** a photo/GPS authenticity verifier. Attestors review evidence off-chain before confirming onchain. The contract enforces *process*, attestors verify *content*.
- **Not** a recipient KYC system. End recipients are not identified onchain.
- **Not** a fiat off-ramp. Funds settle in USDC.

## Honesty rules

No fabricated hashes. No synthetic data labeled as real. The demo proof payloads use clearly synthetic `synthetic://photo-N.jpg` refs and approximate lat/lon values; do not present them as real field data.
