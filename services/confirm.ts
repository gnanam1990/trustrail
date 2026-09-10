/**
 * TrustRail attestor-side confirm tool.
 * Reviews off-chain evidence (mocked for demo) and calls confirmProof.
 *
 * Usage:
 *   tsx services/confirm.ts <campaignId> <trancheIndex> [attestorKey]
 *
 * Env:
 *   VAULT_ADDRESS, ATTESTOR1_KEY (default), ARC_TESTNET_RPC
 *
 * Unaudited testnet software — no real funds.
 */
import { confirmProof, VAULT, A1_PK, ARC_RPC, link } from "./proof.ts";

function usage(): never {
  console.error("Usage: tsx services/confirm.ts <campaignId> <trancheIndex> [attestorKey]");
  process.exit(1);
}

async function main() {
  const [campaignIdRaw, trancheIndexRaw, attestorKeyRaw] = process.argv.slice(2);
  if (!campaignIdRaw || !trancheIndexRaw) usage();
  const campaignId = BigInt(campaignIdRaw);
  const trancheIndex = Number(trancheIndexRaw);
  const attestorKey = attestorKeyRaw ?? A1_PK;
  if (!VAULT) {
    console.error("Missing VAULT_ADDRESS env");
    process.exit(1);
  }
  if (!attestorKey) {
    console.error("Missing attestor key (arg or ATTESTOR1_KEY env)");
    process.exit(1);
  }

  // Mock review: in production, fetch + verify photo/GPS/recipient evidence here.
  console.log(
    `  [review] mocked evidence review for campaign=${campaignId.toString()} tranche=${trancheIndex}: OK`
  );
  const res = await confirmProof(VAULT, attestorKey, ARC_RPC, campaignId, trancheIndex);
  console.log(`  confirmProof tx: ${link("tx", res.txHash)}  block ${res.blockNumber}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
