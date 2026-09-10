# TrustRail

**The neutral aid-disbursement rail. Built on Arc.**

Donors fund a campaign split into tranches; NGOs receive each tranche only after M-of-N attestors confirm proof-of-distribution for the prior one. Unused tranches can be reclaimed by donors after a grace period.

Status: early build · Arc testnet · **unaudited — do not use with real funds.**

Docs: [`docs/PRD.md`](docs/PRD.md) · Build prompts: [`PROMPT.md`](PROMPT.md) · Testnet addresses: [`docs/addresses.md`](docs/addresses.md) · Off-chain services: [`services/README.md`](services/README.md)

## Network (Arc Testnet)

- Chain ID: `5042002`
- RPC: `https://rpc.testnet.arc.network`
- Explorer: `https://testnet.arcscan.app`

## Quickstart (dev)

```bash
forge install
forge build
forge test
npm install && npm test
```

## Deploy + demo (Arc testnet)

```bash
cp .env.example .env
# fill in PRIVATE_KEY, USDC_ADDRESS, DONOR_KEY, NGO_KEY, ATTESTOR*_KEY, VAULT_ADDRESS
source .env
forge script script/Deploy.s.sol:Deploy --rpc-url $ARC_TESTNET_RPC --broadcast
VAULT_ADDRESS=0x... npm run demo
```

See [`docs/addresses.md`](docs/addresses.md) for funded-key setup, faucet, and lifecycle proof.

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
