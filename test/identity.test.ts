import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeTimestamp,
  encodeTimestamp,
  generateUniqueId,
  isValidId,
} from "../src/identity.js";

test("encodes the selected timestamp format and grows without truncation", () => {
  assert.equal(decodeTimestamp("TNLC00"), 1_793_145_600n);
  assert.equal(encodeTimestamp(1_793_145_600n), "TNLC00");
  assert.equal(encodeTimestamp(36n ** 6n), "1000000");
});

test("validates canonical IDs without normalizing input", () => {
  assert.equal(isValidId("000000K7Q2"), true);
  assert.equal(isValidId("1000000K7Q2"), true);
  assert.equal(isValidId("0000000K7Q2"), false);
  assert.equal(isValidId("TNLC00k7q2"), false);
  assert.equal(isValidId("TNLC0K7Q2"), false);
});

test("retries an injected collision with fresh randomness", () => {
  const selections = [0, 0, 0, 0, 1, 1, 1, 1];
  let position = 0;
  const id = generateUniqueId(new Set(["0000000000"]), {
    timestampSeconds: 0n,
    chooseIndex: () => selections[position++] ?? 2,
  });
  assert.equal(id, "0000001111");
  assert.equal(position, 8);
});

test("stops after the bounded collision attempts", () => {
  assert.throws(
    () => generateUniqueId(new Set(["0000000000"]), {
      timestampSeconds: 0n,
      chooseIndex: () => 0,
      attempts: 2,
    }),
    /after 2 attempts/,
  );
});

test("propagates secure-random source failures", () => {
  assert.throws(
    () => generateUniqueId(new Set(), {
      timestampSeconds: 0n,
      chooseIndex: () => {
        throw new Error("secure randomness unavailable");
      },
    }),
    /secure randomness unavailable/,
  );
});
