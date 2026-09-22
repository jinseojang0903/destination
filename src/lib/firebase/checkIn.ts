import { runTransaction } from "firebase/firestore";
import { db } from "./client";
import { userDocRef } from "./attempts";
import { computeCheckIn, todayKST, type CheckInResult } from "@/lib/checkin/streak";

export type { CheckInResult };

/** Records today's check-in (KST) for the account, once per day, and grants
 * the resulting attempts. See lib/checkin/streak.ts for the reward logic. */
export async function checkInToday(phoneNumber: string): Promise<CheckInResult> {
  const today = todayKST();

  return runTransaction(db, async (tx) => {
    const ref = userDocRef(phoneNumber);
    const snap = await tx.get(ref);
    const data = snap.exists() ? snap.data() : {};

    const result = computeCheckIn(data.lastCheckInDate ?? null, data.checkInStreak ?? 0, today);
    if (result.alreadyCheckedIn) return result;

    const checkIns: string[] = [...(data.checkIns ?? []), today];
    tx.set(
      ref,
      {
        checkIns,
        checkInStreak: result.streak,
        lastCheckInDate: today,
        attemptsRemaining: (data.attemptsRemaining ?? 0) + result.attemptsGranted,
        attemptsGrantedTotal: (data.attemptsGrantedTotal ?? 0) + result.attemptsGranted,
      },
      { merge: true }
    );

    return result;
  });
}
