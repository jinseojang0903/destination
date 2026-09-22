/** Every check-in grants a small daily attempt, no cap on how high
 * attemptsRemaining can climb — plus every Nth consecutive day stacks an
 * extra bonus on top, rewarding people who keep the streak going. */
const DAILY_BASE_BONUS = 1;
const STREAK_INTERVAL = 7;
const STREAK_BONUS = 1;

/** "YYYY-MM-DD" in KST, regardless of the device's own timezone, so the
 * daily boundary is consistent for everyone using the app. */
function kstDateString(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function todayKST(): string {
  return kstDateString(new Date());
}

function isConsecutiveDay(previous: string, today: string): boolean {
  const prevDate = new Date(`${previous}T00:00:00+09:00`);
  const todayDate = new Date(`${today}T00:00:00+09:00`);
  const diffDays = Math.round((todayDate.getTime() - prevDate.getTime()) / 86_400_000);
  return diffDays === 1;
}

export interface CheckInResult {
  alreadyCheckedIn: boolean;
  streak: number;
  streakBonusGranted: boolean;
  attemptsGranted: number;
}

/** Pure streak-advancement logic — no Firebase imports, so it's directly
 * unit-testable without needing real project credentials. A missed day
 * breaks the streak back to 1 (but that day's check-in still grants the
 * base bonus). */
export function computeCheckIn(lastCheckInDate: string | null, currentStreak: number, today: string): CheckInResult {
  if (lastCheckInDate === today) {
    return { alreadyCheckedIn: true, streak: currentStreak, streakBonusGranted: false, attemptsGranted: 0 };
  }
  const streak = lastCheckInDate && isConsecutiveDay(lastCheckInDate, today) ? currentStreak + 1 : 1;
  const streakBonusGranted = streak % STREAK_INTERVAL === 0;
  const attemptsGranted = DAILY_BASE_BONUS + (streakBonusGranted ? STREAK_BONUS : 0);
  return { alreadyCheckedIn: false, streak, streakBonusGranted, attemptsGranted };
}
