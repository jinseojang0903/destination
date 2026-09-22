import { describe, it, expect } from "vitest";
import { buildMonthCalendar } from "./calendar";

describe("buildMonthCalendar", () => {
  it("returns every day of the month containing todayStr", () => {
    const days = buildMonthCalendar("2026-09-15", []);
    expect(days).toHaveLength(30); // September has 30 days
    expect(days[0].dateStr).toBe("2026-09-01");
    expect(days[29].dateStr).toBe("2026-09-30");
  });

  it("marks the matching day as isToday", () => {
    const days = buildMonthCalendar("2026-09-15", []);
    const today = days.find((d) => d.isToday);
    expect(today?.dateStr).toBe("2026-09-15");
  });

  it("marks days present in checkIns as checkedIn", () => {
    const days = buildMonthCalendar("2026-09-15", ["2026-09-01", "2026-09-14", "2026-08-31"]);
    expect(days.find((d) => d.dateStr === "2026-09-01")?.checkedIn).toBe(true);
    expect(days.find((d) => d.dateStr === "2026-09-14")?.checkedIn).toBe(true);
    expect(days.find((d) => d.dateStr === "2026-09-02")?.checkedIn).toBe(false);
    // a check-in from a different month shouldn't match any day here
    expect(days.some((d) => d.checkedIn && d.dateStr === "2026-08-31")).toBe(false);
  });

  it("assigns correct weekdays (Sept 1 2026 is a Tuesday)", () => {
    const days = buildMonthCalendar("2026-09-15", []);
    expect(days[0].weekday).toBe(2); // 0=Sun..6=Sat, Tuesday=2
  });
});
