# TrustRail — testnet addresses & lifecycle proof

**Unaudited testnet software — no real funds.**

## Arc Testnet (chain 5042002)

| Resource | Value | Source |
|----------|-------|--------|
| RPC | `https://rpc.testnet.arc.network` | docs.arc.io |
| Explorer | `https://testnet.arcscan.app` | docs |
| USDC ERC-20 | `0x3600000000000000000000000000000000000000` | docs.arc.io/arc/references/contract-addresses |
| USDC decimals | 6 (verified onchain) | cast call |

## TrancheVault deployment

Real testnet deploy from this repo is pending a deployer key funded with testnet USDC (Circle faucet: https://faucet.circle.com/, browser-only reCAPTCHA).

### Validated deployment (Anvil fork of Arc testnet, block 53,586,848)

- **Contract**: TrancheVault
- **Deployed address (fork)**: `0xf48883f2ae4c4bf4654f45997fe47d73daa4da07`
- **Deploy tx (fork)**: `0xcf8ef9cd9fbcb3facbafbffe688f56edf90a54ed8f702c910b861fc5091e7d28`
- **Block (fork)**: `0x331ae00` (= 53,596,928)
- **Tool**: `forge script script/Deploy.s.sol:Deploy --rpc-url $ARC_TESTNET_RPC --broadcast`
- **Run log**: `broadcast/Deploy.s.sol/5042002/run-latest.json`

The two demo scenarios from PRD §5 are scripted in `services/proof.ts` (CLI) and ready to run against real Arc testnet with a funded key. See README.md.

## How to run on real Arc testnet

```bash
# 1. Fund the deployer: https://faucet.circle.com/ — Arc Testnet + USDC
# 2. Set up .env
cp .env.example .env
# fill in PRIVATE_KEY, USDC_ADDRESS, DONOR_KEY, NGO_KEY, ATTESTOR1_KEY, ATTESTOR2_KEY, ATTESTOR3_KEY
source .env
forge script script/Deploy.s.sol:Deploy --rpc-url $ARC_TESTNET_RPC --broadcast
# 3. Run the demos
VAULT_ADDRESS=0x... npm run demo
```

## Summary

| Metric | Value |
|--------|-------|
| Foundry tests | 15 / 15 passing (incl. 512-run conservation fuzz) |
| Off-chain unit tests | 6 / 6 passing |
| Invariants encoded | 5 / 5 from PROMPT.md |
| Real testnet deploy | pending funded key |
| Fork deploy | ✅ validated end-to-end on Anvil fork of Arc testnet at latest block |
