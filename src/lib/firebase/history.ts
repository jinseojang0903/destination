import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./client";
import { userDocRef } from "./attempts";
import type { HistoryEntry, DestinationInfo, RegionSelection } from "@/types/destination";

function historyCollectionRef(uid: string) {
  return collection(db, "users", uid, "history");
}

export function normalizeDedupeKey(countryCode: string | null, cityName: string | null): string {
  if (!countryCode) return "unknown";
  const city = cityName?.trim().toLowerCase();
  return city ? `${countryCode.toLowerCase()}|${city}` : countryCode.toLowerCase();
}

/** Fetches the set of dedupe keys already in this user's history, so the
 * reroll loop can check duplicates in memory instead of a query per retry. */
export async function getHistoryDedupeKeys(uid: string): Promise<Set<string>> {
  const snap = await getDocs(historyCollectionRef(uid));
  return new Set(snap.docs.map((d) => d.data().dedupeKey as string));
}

export async function listHistory(uid: string): Promise<HistoryEntry[]> {
  const q = query(historyCollectionRef(uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      lat: data.lat,
      lng: data.lng,
      countryCode: data.countryCode ?? null,
      countryName: data.countryName ?? null,
      cityName: data.cityName ?? null,
      photoUrl: data.photoUrl ?? null,
      createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
      dedupeKey: data.dedupeKey,
      regionSelectionType: data.regionSelectionType,
      regionSelectionValue: data.regionSelectionValue,
      throwPower: data.throwPower,
      rerollCount: data.rerollCount,
    } satisfies HistoryEntry;
  });
}

export async function getHistoryEntry(uid: string, historyId: string): Promise<HistoryEntry | null> {
  const snap = await getDoc(doc(historyCollectionRef(uid), historyId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    lat: data.lat,
    lng: data.lng,
    countryCode: data.countryCode ?? null,
    countryName: data.countryName ?? null,
    cityName: data.cityName ?? null,
    photoUrl: data.photoUrl ?? null,
    createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
    dedupeKey: data.dedupeKey,
    regionSelectionType: data.regionSelectionType,
    regionSelectionValue: data.regionSelectionValue,
    throwPower: data.throwPower,
    rerollCount: data.rerollCount,
  } satisfies HistoryEntry;
}

export interface CommitOfficialThrowInput extends DestinationInfo {
  regionSelection: RegionSelection;
  throwPower: number;
  rerollCount: number;
}

/**
 * Atomically decrements attemptsRemaining and writes the history entry, so a
 * throw can never be "spent" without a saved result (or vice versa). Throws
 * if the user has no attempts left at commit time (defense in depth: the UI
 * should already prevent starting a throw with 0 attempts, but a second tab
 * / stale state shouldn't be able to double-spend).
 */
export async function commitOfficialThrow(uid: string, input: CommitOfficialThrowInput): Promise<string> {
  const newHistoryRef = doc(historyCollectionRef(uid));
  const regionValue = input.regionSelection.type === "continent" ? input.regionSelection.continent : input.regionSelection.iso3;

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userDocRef(uid));
    const attemptsRemaining = userSnap.exists() ? (userSnap.data().attemptsRemaining ?? 0) : 0;
    if (attemptsRemaining <= 0) {
      throw new Error("NO_ATTEMPTS_REMAINING");
    }

    tx.update(userDocRef(uid), { attemptsRemaining: attemptsRemaining - 1 });
    tx.set(newHistoryRef, {
      lat: input.lat,
      lng: input.lng,
      countryCode: input.countryCode,
      countryName: input.countryName,
      cityName: input.cityName,
      photoUrl: input.photoUrl,
      dedupeKey: normalizeDedupeKey(input.countryCode, input.cityName),
      regionSelectionType: input.regionSelection.type,
      regionSelectionValue: regionValue,
      throwPower: input.throwPower,
      rerollCount: input.rerollCount,
      createdAt: serverTimestamp(),
    });
  });

  return newHistoryRef.id;
}
