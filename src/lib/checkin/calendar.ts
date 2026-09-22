export interface CalendarDay {
  dateStr: string; // "YYYY-MM-DD"
  day: number;
  weekday: number; // 0 (Sun) .. 6 (Sat)
  checkedIn: boolean;
  isToday: boolean;
}

/** All days of the month that `todayStr` ("YYYY-MM-DD") falls in, marking
 * which ones are in `checkIns`. Pure date math, no timezone conversion
 * needed since todayStr's Y/M/D components are used directly. */
export function buildMonthCalendar(todayStr: string, checkIns: string[]): CalendarDay[] {
  const [year, month] = todayStr.split("-").map(Number);
  const checkedSet = new Set(checkIns);
  const daysInMonth = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({
      dateStr,
      day: d,
      weekday: new Date(year, month - 1, d).getDay(),
      checkedIn: checkedSet.has(dateStr),
      isToday: dateStr === todayStr,
    });
  }
  return days;
}
