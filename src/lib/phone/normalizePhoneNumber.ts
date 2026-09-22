/**
 * Normalizes a Korean-style phone number input ("010-1234-5678",
 * "01012345678") into E.164 ("+821012345678") for Firebase Phone Auth.
 * Inputs already in E.164 form (starting with "+") are passed through with
 * non-digit characters stripped. Returns null if the input has too few
 * digits to plausibly be a phone number.
 */
export function normalizePhoneNumber(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    return digits.length >= 8 ? `+${digits}` : null;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 9) return null;

  // Korean local mobile/landline numbers start with a trunk "0" that's
  // dropped in E.164 form, e.g. 010-1234-5678 -> +82 10-1234-5678.
  const withoutTrunkZero = digits.startsWith("0") ? digits.slice(1) : digits;
  return `+82${withoutTrunkZero}`;
}
