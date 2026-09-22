import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db } from "./client";
import type { UserProfile } from "@/types/user";

const DEFAULT_ATTEMPTS = 1;

/** The user's account is keyed by their verified phone number (E.164, e.g.
 * "+821012345678") rather than the opaque Firebase Auth uid, so the account
 * a phone number belongs to is directly visible in the Firestore console —
 * important since granting extra attempts is a manual console edit. */
function userDocRef(phoneNumber: string) {
  return doc(db, "users", phoneNumber);
}

function mapUserDoc(snap: DocumentSnapshot): UserProfile {
  const data = snap.data()!;
  return {
    phoneNumber: data.phoneNumber ?? null,
    createdAt: data.createdAt?.toMillis?.() ?? null,
    attemptsRemaining: data.attemptsRemaining ?? 0,
    attemptsGrantedTotal: data.attemptsGrantedTotal ?? 0,
    checkIns: data.checkIns ?? [],
    checkInStreak: data.checkInStreak ?? 0,
    lastCheckInDate: data.lastCheckInDate ?? null,
  };
}

/** Creates the user's profile doc the first time they confirm their phone
 * number. Callers should check `getUserProfile` first and only call this for
 * first-time sign-ins, since it unconditionally resets attempts. */
export async function createUserProfile(phoneNumber: string): Promise<void> {
  await setDoc(userDocRef(phoneNumber), {
    phoneNumber,
    createdAt: serverTimestamp(),
    attemptsRemaining: DEFAULT_ATTEMPTS,
    attemptsGrantedTotal: DEFAULT_ATTEMPTS,
    checkIns: [],
    checkInStreak: 0,
    lastCheckInDate: null,
  });
}

export async function getUserProfile(phoneNumber: string): Promise<UserProfile | null> {
  const snap = await getDoc(userDocRef(phoneNumber));
  if (!snap.exists()) return null;
  return mapUserDoc(snap);
}

/** Live-subscribes to the user's profile (attempts remaining changes when an
 * official throw is committed, or when the developer manually grants more
 * via the Firebase console). */
export function subscribeUserProfile(phoneNumber: string, onChange: (profile: UserProfile | null) => void): Unsubscribe {
  return onSnapshot(userDocRef(phoneNumber), (snap) => {
    if (!snap.exists()) {
      onChange(null);
      return;
    }
    onChange(mapUserDoc(snap));
  });
}

export { userDocRef };
