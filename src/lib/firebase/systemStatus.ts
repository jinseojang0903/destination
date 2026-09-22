import { doc, getDoc } from "firebase/firestore";
import { db } from "./client";

/**
 * Manual kill switch for phone-auth sign-in, independent of any spend-based
 * automation. Fail-closed: if `systemStatus/config` doesn't exist yet (e.g.
 * fresh project, nobody's flipped it on), phone auth is treated as OFF.
 *
 * To open sign-ins to real users: Firebase console → Firestore →
 * create collection `systemStatus` → document ID `config` → add a boolean
 * field `phoneAuthEnabled` set to `true`. Flip it back to `false` (or delete
 * the doc) to lock it again — no redeploy needed either way.
 */
export async function isPhoneAuthEnabled(): Promise<boolean> {
  const snap = await getDoc(doc(db, "systemStatus", "config"));
  if (!snap.exists()) return false;
  return snap.data().phoneAuthEnabled === true;
}
