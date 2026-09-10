/**
 * TrustRail demo runner.
 * Runs PRD §5 demo scenarios against a deployed TrancheVault on Arc Testnet.
 *
 * Usage:
 *   tsx services/demo.ts [1|2|all]
 *
 * Env: see proof.ts (VAULT_ADDRESS, USDC_ADDRESS, DONOR_KEY, NGO_KEY, ...).
 * Unaudited testnet software — no real funds. All proof payloads are synthetic.
 */
import { scenario1, scenario2 } from "./proof.ts";

async function main() {
  const which = process.argv[2] ?? "all";
  if (which === "1" || which === "all") await scenario1();
  if (which === "2" || which === "all") await scenario2();
  if (which !== "1" && which !== "2" && which !== "all") {
    console.error("Usage: tsx services/demo.ts [1|2|all]");
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
