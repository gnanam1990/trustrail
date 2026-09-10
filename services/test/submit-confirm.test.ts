import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import {
  buildProofHash,
  submitProofWithContract,
  confirmProofWithContract,
  notifyProofSubmitted,
  getUsdcDecimals,
} from "../proof.ts";

describe("notifyProofSubmitted (stub)", () => {
  it("logs a ProofSubmitted line with campaign/tranche/recipients", () => {
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };
    try {
      notifyProofSubmitted(1, 0, "0x" + "ab".repeat(32), 40);
    } finally {
      console.log = orig;
    }
    assert.equal(logs.length, 1);
    assert.match(logs[0], /ProofSubmitted/);
    assert.match(logs[0], /campaign=1/);
    assert.match(logs[0], /tranche=0/);
    assert.match(logs[0], /recipients=40/);
  });
});

describe("submitProofWithContract (mocked chain)", () => {
  it("calls contract.submitProof with hash + recipientCount and notifies", async () => {
    const input = {
      campaignId: 7,
      trancheIndex: 1,
      photoRef: "synthetic://photo-1.jpg",
      gps: { lat: 1.4, lon: 103.9 },
      recipientCount: 42,
    };
    const expectedHash = buildProofHash(input);
    let seenArgs: unknown[] | null = null;
    const fakeReceipt = { hash: "0xdeadbeef", blockNumber: 123 };
    const mocked = {
      submitProof: mock.fn(async (...args: unknown[]) => {
        seenArgs = args;
        return { wait: async () => fakeReceipt };
      }),
    };

    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };
    let res;
    try {
      res = await submitProofWithContract(mocked, input);
    } finally {
      console.log = orig;
    }

    assert.equal(mocked.submitProof.mock.callCount(), 1);
    assert.deepEqual(seenArgs, [7, 1, expectedHash, 42]);
    assert.equal(res.proofHash, expectedHash);
    assert.equal(res.txHash, fakeReceipt.hash);
    assert.equal(res.blockNumber, fakeReceipt.blockNumber);
    // notify stub fired
    assert.ok(logs.some((l) => l.includes("ProofSubmitted") && l.includes("recipients=42")));
  });

  it("passes recipientCount through (regression: must not submit 0)", async () => {
    const input = {
      campaignId: 1,
      trancheIndex: 0,
      photoRef: "p",
      gps: { lat: 1, lon: 2 },
      recipientCount: 100,
    };
    let seenCount: unknown = null;
    const mocked = {
      submitProof: async (_c: unknown, _t: unknown, _h: unknown, n: unknown) => {
        seenCount = n;
        return { wait: async () => ({ hash: "0xh", blockNumber: 1 }) };
      },
    };
    const orig = console.log;
    console.log = () => {};
    try {
      await submitProofWithContract(mocked, input);
    } finally {
      console.log = orig;
    }
    assert.equal(seenCount, 100);
  });
});

describe("confirmProofWithContract (mocked chain)", () => {
  it("calls contract.confirmProof with campaign + tranche", async () => {
    let seenArgs: unknown[] | null = null;
    const fakeReceipt = { hash: "0xconfirm", blockNumber: 456 };
    const mocked = {
      confirmProof: mock.fn(async (...args: unknown[]) => {
        seenArgs = args;
        return { wait: async () => fakeReceipt };
      }),
    };
    const res = await confirmProofWithContract(mocked, 7, 2);
    assert.equal(mocked.confirmProof.mock.callCount(), 1);
    assert.deepEqual(seenArgs, [7, 2]);
    assert.equal(res.txHash, fakeReceipt.hash);
    assert.equal(res.blockNumber, fakeReceipt.blockNumber);
  });
});

describe("getUsdcDecimals", () => {
  it("reads decimals onchain instead of assuming a literal", async () => {
    const mocked = { decimals: async () => 6 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dec = await getUsdcDecimals(mocked as any);
    assert.equal(dec, 6);
  });
});
