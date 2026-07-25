# TrustRail — staged Claude Code build prompts

Read docs/PRD.md fully first. One stage at a time, confirm green before the next.

---
## STAGE 1 — Core contract (TrancheVault)

Foundry, tests before implementation.

INVARIANTS:
1. Tranche N+1 is unreachable until tranche N's proof-of-distribution has been confirmed (by the configured M-of-N attestor threshold for that campaign).
2. Funds release ONLY to the registered NGO address for that campaign — never a free-text destination.
3. An unclaimed tranche is reclaimable by the donor ONLY after its grace period has elapsed with no valid proof submitted.
4. M-of-N attestor confirmation requires distinct attestor addresses — no double-counting one attestor's confirmation.
5. Conservation: fuzz that every campaign's total released + reclaimed never exceeds total funded.

BUILD: `createCampaign(ngo, tranches[], attestors[], threshold)`, `submitProof(campaignId, trancheIndex, proofHash, recipientCount)`, `confirmProof(campaignId, trancheIndex)` (attestor-only, counts toward threshold), `claimTranche(campaignId, trancheIndex)` (NGO, after threshold met), `reclaimExpired(campaignId, trancheIndex)` (donor, after grace period with no confirmed proof). Full test suite + fuzz on invariant 5. Report test count and invariants covered.

---
## STAGE 2 — Attestation service (off-chain)

TypeScript service (services/) for attestors:
- `submit-proof.ts`: NGO-side tool to package photo/GPS/recipient-count into a hash and call `submitProof`.
- `confirm.ts`: attestor-side tool to review off-chain evidence (mocked for demo) and call `confirmProof`.
- A simple notification stub (console log is fine for v1) alerting registered attestors when a new proof needs review.
Tests with mocked chain calls; synthetic demo data only, clearly labeled as such.

---
## STAGE 3 — Arc testnet deployment + lifecycle proof

Deploy to Arc testnet (RPC https://rpc.testnet.arc.network, chain 5042002). Verify the USDC address onchain before use (symbol/decimals check) — read docs.arc.io/arc/references/evm-differences first for the non-decreasing-timestamp and zero-address-revert quirks. Deployer key from .env, never committed.

Run both demo scenarios from PRD §5 as real transactions on testnet: (1) the full 3-tranche release with 2-of-3 attestor confirmation, (2) an expired tranche reclaimed by the donor. Capture every explorer link into docs/addresses.md. Verify contract source on testnet.arcscan.app.

---
## STAGE 4 — Demo interface

Minimal CLI or single-page UI showing: campaign list, each tranche's state (Locked/ProofSubmitted/Confirmed/Claimed/Reclaimed), attestor confirmation count vs threshold, and a one-command trigger for each demo scenario that prints the real explorer link. Label clearly as unaudited testnet software. Update README with quickstart. Commit and report final state.
