"use client";

import Link from "next/link";
import type { HistoryEntry } from "@/types/destination";
import { bilingualName } from "@/lib/format/place";

export function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-center text-neutral-400">아직 던진 기록이 없어요.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {entries.map((entry) => (
        <li key={entry.id}>
          <Link
            href={`/result/${entry.id}`}
            className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-3"
          >
            <div
              className="h-14 w-14 shrink-0 rounded-md bg-neutral-800 bg-cover bg-center"
              style={{ backgroundImage: entry.photoUrl ? `url(${entry.photoUrl})` : undefined }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {bilingualName(entry.cityNameKo, entry.cityName) ?? bilingualName(entry.countryNameKo, entry.countryName) ?? "알 수 없는 지역"}
              </p>
              <p className="truncate text-sm text-neutral-400">{bilingualName(entry.countryNameKo, entry.countryName)}</p>
            </div>
            <p className="shrink-0 text-xs text-neutral-500">
              {new Date(entry.createdAt).toLocaleDateString("ko-KR")}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
