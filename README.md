# TrustRail

**The neutral aid-disbursement rail. Built on Arc.**

Donors fund a campaign split into tranches; NGOs receive each tranche only after M-of-N attestors confirm proof-of-distribution for the prior one. Unused tranches can be reclaimed by donors after a grace period.

Status: early build · Arc testnet · **unaudited — do not use with real funds.**

Docs: [`docs/PRD.md`](docs/PRD.md) · Build prompts: [`PROMPT.md`](PROMPT.md) · Testnet addresses: [`docs/addresses.md`](docs/addresses.md)

## Quickstart (dev)

```bash
forge test
npm install && npm test
```

## Layout

- `src/` — onchain contracts (TrancheVault).
- `test/` — Foundry unit + fuzz tests (invariants).
- `services/` — off-chain proof + attestor tools.
- `script/` — deployment + demo scenarios.
- `docs/addresses.md` — testnet addresses + lifecycle proof.

## Honesty rules

- Unaudited testnet software — do not use with real funds.
- Attestors verify *content* (photo, GPS, recipient count) off-chain; the contract enforces *process* (M-of-N confirmation, tranche ordering).
- No image/photo authenticity verification onchain.
