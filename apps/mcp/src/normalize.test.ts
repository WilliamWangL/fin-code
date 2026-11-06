import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeIdentifier } from "./normalize.js";

describe("normalizeIdentifier", () => {
  it("strips the separators humans type", () => {
    assert.equal(normalizeIdentifier("DE89 3704 0044 0532 0130 00"), "DE89370400440532013000");
    assert.equal(normalizeIdentifier("60-83-71"), "608371");
    assert.equal(normalizeIdentifier("  hbukgb4b  "), "HBUKGB4B");
  });
});
