import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { db } from "./client";
import type { UserProfile } from "@/types/user";

const DEFAULT_ATTEMPTS = 1;

function userDocRef(uid: string) {
  return doc(db, "users", uid);
}

/** Creates the user's profile doc the first time they confirm their phone
 * number. Callers should check `getUserProfile` first and only call this for
 * first-time sign-ins, since it unconditionally resets attempts. */
export async function createUserProfile(uid: string, phoneNumber: string | null): Promise<void> {
  await setDoc(userDocRef(uid), {
    phoneNumber,
    createdAt: serverTimestamp(),
    attemptsRemaining: DEFAULT_ATTEMPTS,
    attemptsGrantedTotal: DEFAULT_ATTEMPTS,
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(userDocRef(uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    phoneNumber: data.phoneNumber ?? null,
    createdAt: data.createdAt?.toMillis?.() ?? null,
    attemptsRemaining: data.attemptsRemaining ?? 0,
    attemptsGrantedTotal: data.attemptsGrantedTotal ?? 0,
  };
}

/** Live-subscribes to the user's profile (attempts remaining changes when an
 * official throw is committed, or when the developer manually grants more
 * via the Firebase console). */
export function subscribeUserProfile(uid: string, onChange: (profile: UserProfile | null) => void): Unsubscribe {
  return onSnapshot(userDocRef(uid), (snap) => {
    if (!snap.exists()) {
      onChange(null);
      return;
    }
    const data = snap.data();
    onChange({
      phoneNumber: data.phoneNumber ?? null,
      createdAt: data.createdAt?.toMillis?.() ?? null,
      attemptsRemaining: data.attemptsRemaining ?? 0,
      attemptsGrantedTotal: data.attemptsGrantedTotal ?? 0,
    });
  });
}

export { userDocRef };
