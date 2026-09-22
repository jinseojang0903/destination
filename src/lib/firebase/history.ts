import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db } from "./client";
import { userDocRef } from "./attempts";
import type { HistoryEntry, DestinationInfo, RegionSelection } from "@/types/destination";

function historyCollectionRef(phoneNumber: string) {
  return collection(db, "users", phoneNumber, "history");
}

function mapHistoryDoc(snap: DocumentSnapshot): HistoryEntry {
  const data = snap.data()!;
  return {
    id: snap.id,
    lat: data.lat,
    lng: data.lng,
    countryCode: data.countryCode ?? null,
    countryName: data.countryName ?? null,
    countryNameKo: data.countryNameKo ?? null,
    cityName: data.cityName ?? null,
    cityNameKo: data.cityNameKo ?? null,
    photoUrl: data.photoUrl ?? null,
    createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
    dedupeKey: data.dedupeKey,
    regionSelectionType: data.regionSelectionType,
    regionSelectionValue: data.regionSelectionValue,
    throwPower: data.throwPower,
    rerollCount: data.rerollCount,
  } satisfies HistoryEntry;
}

export function normalizeDedupeKey(countryCode: string | null, cityName: string | null): string {
  if (!countryCode) return "unknown";
  const city = cityName?.trim().toLowerCase();
  return city ? `${countryCode.toLowerCase()}|${city}` : countryCode.toLowerCase();
}

/** Fetches the set of dedupe keys already in this user's history, so the
 * reroll loop can check duplicates in memory instead of a query per retry. */
export async function getHistoryDedupeKeys(phoneNumber: string): Promise<Set<string>> {
  const snap = await getDocs(historyCollectionRef(phoneNumber));
  return new Set(snap.docs.map((d) => d.data().dedupeKey as string));
}

export async function listHistory(phoneNumber: string): Promise<HistoryEntry[]> {
  const q = query(historyCollectionRef(phoneNumber), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(mapHistoryDoc);
}

export async function getHistoryEntry(phoneNumber: string, historyId: string): Promise<HistoryEntry | null> {
  const snap = await getDoc(doc(historyCollectionRef(phoneNumber), historyId));
  if (!snap.exists()) return null;
  return mapHistoryDoc(snap);
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
export async function commitOfficialThrow(phoneNumber: string, input: CommitOfficialThrowInput): Promise<string> {
  const newHistoryRef = doc(historyCollectionRef(phoneNumber));
  const regionValue = input.regionSelection.type === "continent" ? input.regionSelection.continent : input.regionSelection.iso3;

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userDocRef(phoneNumber));
    const attemptsRemaining = userSnap.exists() ? (userSnap.data().attemptsRemaining ?? 0) : 0;
    if (attemptsRemaining <= 0) {
      throw new Error("NO_ATTEMPTS_REMAINING");
    }

    tx.update(userDocRef(phoneNumber), { attemptsRemaining: attemptsRemaining - 1 });
    tx.set(newHistoryRef, {
      lat: input.lat,
      lng: input.lng,
      countryCode: input.countryCode,
      countryName: input.countryName,
      countryNameKo: input.countryNameKo,
      cityName: input.cityName,
      cityNameKo: input.cityNameKo,
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
