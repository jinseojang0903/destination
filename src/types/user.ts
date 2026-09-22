export interface UserProfile {
  phoneNumber: string | null;
  createdAt: number | null;
  attemptsRemaining: number;
  attemptsGrantedTotal: number;
  /** "YYYY-MM-DD" (KST) dates the user has checked in on. */
  checkIns: string[];
  /** Consecutive daily check-in count, ending on `lastCheckInDate`. */
  checkInStreak: number;
  lastCheckInDate: string | null;
}
