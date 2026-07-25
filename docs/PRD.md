# TrustRail — PRD v1.0

**The neutral aid-disbursement rail. Built on Arc.**

## 1. Problem
Global humanitarian aid moves $30B+/year, and diversion, overhead loss, and opaque accounting before funds reach recipients are a documented, scandal-level trust problem across the sector. Existing platforms are each one charity's own donation button — none function as neutral, reusable disbursement infrastructure other NGOs could adopt.

## 2. Solution (MVP scope)
**TrancheVault (contract).** A donor (or donor pool) funds a campaign in USDC, split into N tranches. An NGO partner is registered against the campaign. Tranche 1 is available immediately on funding. Tranche 2+ unlocks only after the NGO submits a **proof-of-distribution** record for the prior tranche — a hash of photo evidence + GPS coordinates + a recipient count — and that record passes a lightweight attestation check (see Stage 2). Unclaimed/disputed tranches can be reclaimed by the donor after a long grace period, so funds never sit stranded indefinitely.

**Multi-attestor option.** For larger campaigns, tranche unlock can require M-of-N independent attestors (other NGO staff, a local auditor) to confirm the proof-of-distribution hash before release — configurable per campaign, not hardcoded.

## 3. Why Arc specifically
Sub-second finality and USDC-native settlement mean a tranche unlock is instant and final the moment proof clears — donors watching a live disaster response see money move in real time, not "processing." Arc Explorer gives every donor an independently checkable trail from their wallet to the NGO's distribution proof, addressing the sector's central trust deficit directly.

## 4. Non-goals (v1)
No image/video verification AI (assume attestors review evidence off-chain before confirming) · no KYC of end recipients · no fiat off-ramp integration · no token.

## 5. Demo moment
A campaign funds 3 tranches of 500 USDC each. Tranche 1 releases on funding. NGO submits proof for tranche 1 (photo+GPS hash, recipient count 40). Two independent attestors confirm → tranche 2 unlocks automatically. Third scenario: an NGO fails to submit proof within the grace period → donor reclaims the unused tranche.

## 6. Honesty rules
Real transactions only · unaudited testnet label everywhere · never claim to verify photo/GPS authenticity onchain — the contract enforces the *process*, attestors verify the *content*.
