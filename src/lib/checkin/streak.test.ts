import { describe, it, expect } from "vitest";
import { computeCheckIn } from "./streak";

describe("computeCheckIn", () => {
  it("grants 1 attempt for a first-ever check-in (streak becomes 1)", () => {
    const result = computeCheckIn(null, 0, "2026-09-01");
    expect(result).toEqual({ alreadyCheckedIn: false, streak: 1, streakBonusGranted: false, attemptsGranted: 1 });
  });

  it("continues the streak on a consecutive day, still just the base bonus", () => {
    const result = computeCheckIn("2026-09-01", 1, "2026-09-02");
    expect(result.streak).toBe(2);
    expect(result.attemptsGranted).toBe(1);
    expect(result.streakBonusGranted).toBe(false);
  });

  it("stacks an extra bonus on the 7th consecutive day", () => {
    const result = computeCheckIn("2026-09-06", 6, "2026-09-07");
    expect(result.streak).toBe(7);
    expect(result.streakBonusGranted).toBe(true);
    expect(result.attemptsGranted).toBe(2);
  });

  it("resets the streak to 1 (but still grants the base bonus) after a missed day", () => {
    const result = computeCheckIn("2026-09-01", 5, "2026-09-05");
    expect(result.streak).toBe(1);
    expect(result.attemptsGranted).toBe(1);
    expect(result.streakBonusGranted).toBe(false);
  });

  it("grants nothing for a repeat check-in on the same day", () => {
    const result = computeCheckIn("2026-09-05", 3, "2026-09-05");
    expect(result).toEqual({ alreadyCheckedIn: true, streak: 3, streakBonusGranted: false, attemptsGranted: 0 });
  });

  it("stacks bonuses again at the 14th consecutive day", () => {
    const result = computeCheckIn("2026-09-13", 13, "2026-09-14");
    expect(result.streak).toBe(14);
    expect(result.streakBonusGranted).toBe(true);
    expect(result.attemptsGranted).toBe(2);
  });
});
