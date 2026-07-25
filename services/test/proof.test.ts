import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildProofHash } from "../proof.ts";

describe("buildProofHash", () => {
  it("produces a 0x-prefixed 32-byte hex", () => {
    const h = buildProofHash({ campaignId: 1, trancheIndex: 0, photoRef: "p", gps: { lat: 1, lon: 2 }, recipientCount: 10 });
    assert.match(h, /^0x[0-9a-f]{64}$/);
  });
  it("is deterministic for the same input", () => {
    const input = { campaignId: 1, trancheIndex: 0, photoRef: "p", gps: { lat: 1, lon: 2 }, recipientCount: 10 };
    assert.equal(buildProofHash(input), buildProofHash(input));
  });
  it("differs across campaignId", () => {
    const base = { trancheIndex: 0, photoRef: "p", gps: { lat: 1, lon: 2 }, recipientCount: 10 };
    assert.notEqual(
      buildProofHash({ ...base, campaignId: 1 }),
      buildProofHash({ ...base, campaignId: 2 })
    );
  });
  it("differs across trancheIndex", () => {
    const base = { campaignId: 1, photoRef: "p", gps: { lat: 1, lon: 2 }, recipientCount: 10 };
    assert.notEqual(
      buildProofHash({ ...base, trancheIndex: 0 }),
      buildProofHash({ ...base, trancheIndex: 1 })
    );
  });
  it("differs across recipientCount", () => {
    const base = { campaignId: 1, trancheIndex: 0, photoRef: "p", gps: { lat: 1, lon: 2 } };
    assert.notEqual(
      buildProofHash({ ...base, recipientCount: 10 }),
      buildProofHash({ ...base, recipientCount: 20 })
    );
  });
  it("differs across photoRef", () => {
    const base = { campaignId: 1, trancheIndex: 0, gps: { lat: 1, lon: 2 }, recipientCount: 10 };
    assert.notEqual(
      buildProofHash({ ...base, photoRef: "a" }),
      buildProofHash({ ...base, photoRef: "b" })
    );
  });
});
