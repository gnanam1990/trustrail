/**
 * TrustRail NGO-side submit-proof tool.
 * Packages photo/GPS/recipient-count into a hash and calls submitProof.
 *
 * Usage:
 *   tsx services/submit-proof.ts <campaignId> <trancheIndex> <photoRef> <lat> <lon> <recipientCount>
 *
 * Env:
 *   VAULT_ADDRESS, NGO_KEY, ARC_TESTNET_RPC
 *
 * Unaudited testnet software — no real funds. Demo photo refs must be
 * synthetic (e.g. synthetic://photo-0.jpg).
 */
import { submitProof, buildProofHash, notifyProofSubmitted, VAULT, NGO_PK, ARC_RPC, link } from "./proof.ts";

function usage(): never {
  console.error(
    "Usage: tsx services/submit-proof.ts <campaignId> <trancheIndex> <photoRef> <lat> <lon> <recipientCount>"
  );
  process.exit(1);
}

async function main() {
  const [campaignIdRaw, trancheIndexRaw, photoRef, latRaw, lonRaw, recipientCountRaw] =
    process.argv.slice(2);
  if (!campaignIdRaw || !trancheIndexRaw || !photoRef || !latRaw || !lonRaw || !recipientCountRaw) {
    usage();
  }
  const campaignId = BigInt(campaignIdRaw);
  const trancheIndex = Number(trancheIndexRaw);
  const recipientCount = Number(recipientCountRaw);
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!VAULT) {
    console.error("Missing VAULT_ADDRESS env");
    process.exit(1);
  }
  if (!NGO_PK) {
    console.error("Missing NGO_KEY env");
    process.exit(1);
  }

  const input = { campaignId, trancheIndex, photoRef, gps: { lat, lon }, recipientCount };
  const previewHash = buildProofHash(input);
  console.log(`  proof hash (preview): ${previewHash}`);

  const res = await submitProof(VAULT, NGO_PK, ARC_RPC, input);
  // notifyProofSubmitted is already called inside submitProof; log again for CLI clarity.
  notifyProofSubmitted(campaignId, trancheIndex, res.proofHash, recipientCount);
  console.log(`  submitProof tx: ${link("tx", res.txHash)}  block ${res.blockNumber}`);
  console.log(`  proofHash: ${res.proofHash}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
