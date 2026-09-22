import { describe, it, expect } from "vitest";
import { normalizePhoneNumber, formatPhoneInputKR } from "./normalizePhoneNumber";

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

describe("formatPhoneInputKR", () => {
  it("progressively inserts dashes as digits are typed", () => {
    expect(formatPhoneInputKR("010")).toBe("010");
    expect(formatPhoneInputKR("0101234")).toBe("010-1234");
    expect(formatPhoneInputKR("01012345678")).toBe("010-1234-5678");
  });

  it("ignores non-digit characters already present", () => {
    expect(formatPhoneInputKR("010-1234-5678")).toBe("010-1234-5678");
  });

  it("caps at 11 digits", () => {
    expect(formatPhoneInputKR("010123456789999")).toBe("010-1234-5678");
  });
});
