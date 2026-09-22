import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db } from "./client";
import { userDocRef } from "./attempts";
import type { AttemptRequest } from "@/types/attemptRequest";

function requestsCollectionRef() {
  return collection(db, "attemptRequests");
}

function mapRequestDoc(snap: DocumentSnapshot): AttemptRequest {
  const data = snap.data()!;
  return {
    id: snap.id,
    phoneNumber: data.phoneNumber,
    displayName: data.displayName,
    reason: data.reason,
    status: data.status,
    createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
    resolvedAt: data.resolvedAt?.toMillis?.() ?? null,
    grantedAmount: data.grantedAmount ?? null,
  } satisfies AttemptRequest;
}

export async function createAttemptRequest(phoneNumber: string, displayName: string, reason: string): Promise<void> {
  await addDoc(requestsCollectionRef(), {
    phoneNumber,
    displayName,
    reason,
    status: "pending",
    createdAt: serverTimestamp(),
    resolvedAt: null,
    grantedAmount: null,
  });
}

export async function listOwnAttemptRequests(phoneNumber: string): Promise<AttemptRequest[]> {
  const q = query(requestsCollectionRef(), where("phoneNumber", "==", phoneNumber), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(mapRequestDoc);
}

/** Whether this phone number is registered as an admin — checked against a
 * `admins/{phoneNumber}` marker doc that only the developer can create
 * (directly in the Firebase console; there's no in-app way to add admins). */
export async function checkIsAdmin(phoneNumber: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "admins", phoneNumber));
  return snap.exists();
}

export async function listAllAttemptRequests(): Promise<AttemptRequest[]> {
  const q = query(requestsCollectionRef(), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(mapRequestDoc);
}

/** Approves a request and grants the phone number's account `amount` more
 * attempts, atomically. Only succeeds server-side if the caller is an admin
 * (enforced by firestore.rules), regardless of what the client sends. */
export async function approveAttemptRequest(requestId: string, phoneNumber: string, amount: number): Promise<void> {
  const reqRef = doc(requestsCollectionRef(), requestId);
  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userDocRef(phoneNumber));
    const attemptsRemaining = userSnap.exists() ? (userSnap.data().attemptsRemaining ?? 0) : 0;
    const attemptsGrantedTotal = userSnap.exists() ? (userSnap.data().attemptsGrantedTotal ?? 0) : 0;

    tx.set(
      userDocRef(phoneNumber),
      { attemptsRemaining: attemptsRemaining + amount, attemptsGrantedTotal: attemptsGrantedTotal + amount },
      { merge: true }
    );
    tx.update(reqRef, { status: "approved", resolvedAt: serverTimestamp(), grantedAmount: amount });
  });
}

export async function rejectAttemptRequest(requestId: string): Promise<void> {
  await updateDoc(doc(requestsCollectionRef(), requestId), {
    status: "rejected",
    resolvedAt: serverTimestamp(),
  });
}
