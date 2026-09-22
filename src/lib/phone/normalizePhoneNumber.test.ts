import { describe, it, expect } from "vitest";
import { normalizePhoneNumber } from "./normalizePhoneNumber";

describe("normalizePhoneNumber", () => {
  it("converts a dashed Korean mobile number to E.164", () => {
    expect(normalizePhoneNumber("010-1234-5678")).toBe("+821012345678");
  });

  it("converts a plain-digit Korean mobile number to E.164", () => {
    expect(normalizePhoneNumber("01012345678")).toBe("+821012345678");
  });

  it("passes through an already-E.164 number, stripping formatting", () => {
    expect(normalizePhoneNumber("+82 10-1234-5678")).toBe("+821012345678");
  });

  it("returns null for obviously too-short input", () => {
    expect(normalizePhoneNumber("123")).toBeNull();
  });
});
