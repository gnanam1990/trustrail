/**
 * TrustRail off-chain service
 * ---------------------------
 * submit-proof.ts: NGO-side tool to package photo/GPS/recipient-count into a
 *                 hash and call submitProof on the TrancheVault.
 * confirm.ts:      Attestor-side tool to review off-chain evidence (mocked
 *                  for demo) and call confirmProof.
 * demo.ts:         Runs the PRD §5 demo scenarios against a deployed
 *                  TrancheVault on Arc Testnet.
 *
 * Unaudited testnet software — no real funds.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Contract, JsonRpcProvider, Wallet, keccak256, toUtf8Bytes } from "ethers";

// ------------------------------------------------------------------
// Proof hashing — done locally; only the hash reaches the chain.
// ------------------------------------------------------------------

export interface ProofInput {
  campaignId: number | bigint;
  trancheIndex: number;
  /** Mock photo evidence (in production, a CID or signed URL). */
  photoRef: string;
  /** Mock GPS lat/lon. */
  gps: { lat: number; lon: number };
  /** Number of recipients. */
  recipientCount: number;
}

export function buildProofHash(input: ProofInput): string {
  const canonical = JSON.stringify({
    c: input.campaignId.toString(),
    t: input.trancheIndex,
    p: input.photoRef,
    g: `${input.gps.lat},${input.gps.lon}`,
    n: input.recipientCount,
  });
  return "0x" + createHash("sha256").update(canonical).digest("hex");
}

// ------------------------------------------------------------------
// Shared chain helpers
// ------------------------------------------------------------------

export const VAULT_ABI = [
  "function submitProof(uint256,uint256,bytes32,uint256)",
  "function confirmProof(uint256,uint256)",
  "function claimTranche(uint256,uint256)",
  "function reclaimExpired(uint256,uint256)",
  "function getTranche(uint256,uint256) view returns (tuple(uint96 amount,uint64 gracePeriod,uint64 unlockAt,uint64 proofSubmittedAt,uint8 state,bytes32 proofHash,uint256 recipientCount,uint256 confirmationCount))",
  "function getCampaign(uint256) view returns (tuple(address donor,address ngo,uint256 trancheCount,uint256 threshold,tuple(uint96,uint64,uint64,uint64,uint8,bytes32,uint256,uint256)[] tranches))",
  "function isAttestor(uint256,address) view returns (bool)",
] as const;

// ------------------------------------------------------------------
// Notification stub (v1: console log; wire to email/webhook in prod)
// Called whenever a new proof needs attestor review.
// ------------------------------------------------------------------

export function notifyProofSubmitted(
  campaignId: number | bigint,
  trancheIndex: number,
  proofHash: string,
  recipientCount: number
): void {
  console.log(
    `[notify] ProofSubmitted campaign=${campaignId.toString()} tranche=${trancheIndex} ` +
      `hash=${proofHash} recipients=${recipientCount} — attestors notified for review`
  );
}

// Testable core: submit/confirm against an injected Contract-like object
// (real ethers Contract in prod, mocked object in tests).

export interface SubmitProofContract {
  submitProof(
    campaignId: number | bigint,
    trancheIndex: number,
    proofHash: string,
    recipientCount: number
  ): Promise<{ wait(): Promise<{ hash: string; blockNumber: number }> }>;
}

export interface ConfirmProofContract {
  confirmProof(
    campaignId: number | bigint,
    trancheIndex: number
  ): Promise<{ wait(): Promise<{ hash: string; blockNumber: number }> }>;
}

export async function submitProofWithContract(
  c: SubmitProofContract,
  input: ProofInput
) {
  const proofHash = buildProofHash(input);
  const tx = await c.submitProof(input.campaignId, input.trancheIndex, proofHash, input.recipientCount);
  const r = await tx.wait();
  notifyProofSubmitted(input.campaignId, input.trancheIndex, proofHash, input.recipientCount);
  return { proofHash, txHash: r.hash, blockNumber: r.blockNumber };
}

export async function confirmProofWithContract(
  c: ConfirmProofContract,
  campaignId: number | bigint,
  trancheIndex: number
) {
  const tx = await c.confirmProof(campaignId, trancheIndex);
  const r = await tx.wait();
  return { txHash: r.hash, blockNumber: r.blockNumber };
}

export async function submitProof(
  vault: string,
  signerPk: string,
  rpc: string,
  input: ProofInput
) {
  const provider = new JsonRpcProvider(rpc);
  const signer = new Wallet(signerPk, provider);
  const c = new Contract(vault, VAULT_ABI, signer);
  return submitProofWithContract(c as unknown as SubmitProofContract, input);
}

export async function confirmProof(
  vault: string,
  signerPk: string,
  rpc: string,
  campaignId: number | bigint,
  trancheIndex: number
) {
  const provider = new JsonRpcProvider(rpc);
  const signer = new Wallet(signerPk, provider);
  const c = new Contract(vault, VAULT_ABI, signer);
  return confirmProofWithContract(c as unknown as ConfirmProofContract, campaignId, trancheIndex);
}

export async function claimTranche(
  vault: string,
  signerPk: string,
  rpc: string,
  campaignId: number | bigint,
  trancheIndex: number
) {
  const provider = new JsonRpcProvider(rpc);
  const signer = new Wallet(signerPk, provider);
  const c = new Contract(vault, VAULT_ABI, signer);
  const tx = await c.claimTranche(campaignId, trancheIndex);
  const r = await tx.wait();
  return { txHash: r.hash, blockNumber: r.blockNumber };
}

export async function reclaimExpired(
  vault: string,
  signerPk: string,
  rpc: string,
  campaignId: number | bigint,
  trancheIndex: number
) {
  const provider = new JsonRpcProvider(rpc);
  const signer = new Wallet(signerPk, provider);
  const c = new Contract(vault, VAULT_ABI, signer);
  const tx = await c.reclaimExpired(campaignId, trancheIndex);
  const r = await tx.wait();
  return { txHash: r.hash, blockNumber: r.blockNumber };
}

// ------------------------------------------------------------------
// Demo CLI
// ------------------------------------------------------------------

import { formatUnits, parseUnits } from "ethers";

export const ARC_RPC = process.env.ARC_TESTNET_RPC ?? "https://rpc.testnet.arc.network";
export const EXPLORER = process.env.EXPLORER_BASE ?? "https://testnet.arcscan.app";
export const VAULT = process.env.VAULT_ADDRESS ?? "";
export const USDC = process.env.USDC_ADDRESS ?? "0x3600000000000000000000000000000000000000";
export const DONOR_PK = process.env.DONOR_KEY ?? "";
export const NGO_PK = process.env.NGO_KEY ?? "";
export const A1_PK = process.env.ATTESTOR1_KEY ?? "";
export const A2_PK = process.env.ATTESTOR2_KEY ?? "";
export const A3_PK = process.env.ATTESTOR3_KEY ?? "";

export const ERC20_ABI = [
  "function approve(address,uint256) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];
export const VAULT_FULL = [
  ...VAULT_ABI,
  "function createCampaign(uint256,address,uint96[],uint64[],address[],uint256)",
];

export async function getUsdcDecimals(usdc: Contract): Promise<number> {
  return Number(await usdc.decimals());
}

export async function scenario1() {
  console.log("\n=== Scenario 1: 3-tranche release with 2-of-3 attestor confirmation ===\n");
  const provider = new JsonRpcProvider(ARC_RPC);
  const donor = new Wallet(DONOR_PK, provider);
  const ngo = new Wallet(NGO_PK, provider);
  const a1 = new Wallet(A1_PK, provider);
  const a2 = new Wallet(A2_PK, provider);

  const vault = new Contract(VAULT, VAULT_FULL, donor);
  const usdc = new Contract(USDC, ERC20_ABI, donor);
  const usdcDecimals = await getUsdcDecimals(usdc);

  const trancheAmt = parseUnits("500", usdcDecimals);
  const totalAmt = trancheAmt * 3n;
  const amts = [trancheAmt, trancheAmt, trancheAmt];
  const grace = [30n * 24n * 60n * 60n, 30n * 24n * 60n * 60n, 30n * 24n * 60n * 60n];
  const atts = [await a1.getAddress(), await a2.getAddress(), await new Wallet(A3_PK).getAddress()];

  // Approve
  let tx = await usdc.approve(VAULT, totalAmt);
  await tx.wait();
  console.log(`  approve  ${link("tx", tx.hash)}`);

  // Create
  tx = await vault.createCampaign(1, await ngo.getAddress(), amts, grace, atts, 2);
  const r = await tx.wait();
  console.log(`  createCampaign ${link("tx", tx.hash)}  block ${r!.blockNumber}`);

  // For each tranche: submit proof, 2-of-3 confirm, claim
  for (let i = 0; i < 3; i++) {
    const proof = buildProofHash({
      campaignId: 1, trancheIndex: i,
      photoRef: `synthetic://photo-${i}.jpg`,
      gps: { lat: 1.3 + i * 0.1, lon: 103.8 + i * 0.1 },
      recipientCount: 40,
    });
    const vaultNgo = new Contract(VAULT, VAULT_ABI, ngo);
    const tx1 = await vaultNgo.submitProof(1, i, proof, 40);
    await tx1.wait();
    console.log(`  submitProof[${i}]  ${link("tx", tx1.hash)}`);

    const v1 = new Contract(VAULT, VAULT_ABI, a1);
    const v2 = new Contract(VAULT, VAULT_ABI, a2);
    const tca = await v1.confirmProof(1, i); await tca.wait();
    const tcb = await v2.confirmProof(1, i); await tcb.wait();
    console.log(`  confirm[${i}]   ${link("tx", tca.hash)}, ${link("tx", tcb.hash)}`);

    const txc = await vaultNgo.claimTranche(1, i);
    const rc = await txc.wait();
    console.log(`  claim[${i}]     ${link("tx", txc.hash)}  block ${rc!.blockNumber}`);
  }
  console.log(`\n  contract: ${link("address", VAULT)}`);
}

export async function scenario2() {
  console.log("\n=== Scenario 2: expired tranche reclaimed by donor ===\n");
  const provider = new JsonRpcProvider(ARC_RPC);
  const donor = new Wallet(DONOR_PK, provider);
  const ngo = new Wallet(NGO_PK, provider);
  const a1 = new Wallet(A1_PK, provider);

  const vault = new Contract(VAULT, VAULT_FULL, donor);
  const usdc = new Contract(USDC, ERC20_ABI, donor);
  const usdcDecimals = await getUsdcDecimals(usdc);

  const trancheAmt = parseUnits("500", usdcDecimals);
  const totalAmt = trancheAmt * 2n;
  const amts = [trancheAmt, trancheAmt];
  // 60-second grace so we can demonstrate the reclaim in a few minutes
  const grace = [60n, 60n];
  const atts = [await a1.getAddress(), await new Wallet(A2_PK).getAddress()];

  let tx = await usdc.approve(VAULT, totalAmt); await tx.wait();
  tx = await vault.createCampaign(2, await ngo.getAddress(), amts, grace, atts, 2);
  await tx.wait();
  console.log(`  createCampaign ${link("tx", tx.hash)}  (grace=60s for demo)`);

  // NGO never submits proof for tranche 1; wait 75s and reclaim.
  console.log("  waiting 75s for grace period to elapse...");
  await new Promise((r) => setTimeout(r, 75_000));

  const v = new Contract(VAULT, VAULT_ABI, donor);
  tx = await v.reclaimExpired(2, 1);
  const r = await tx.wait();
  console.log(`  reclaim[1]  ${link("tx", tx.hash)}  block ${r!.blockNumber}`);
}

export function link(kind: "tx" | "address", id: string) {
  return `${EXPLORER}/${kind}/${id}`;
}

export const demoConfig = { ARC_RPC, EXPLORER, VAULT, USDC };

export async function main() {
  const which = process.argv[2] ?? "all";
  if (which === "1" || which === "all") await scenario1();
  if (which === "2" || which === "all") await scenario2();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
