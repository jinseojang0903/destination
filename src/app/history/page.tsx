"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listHistory } from "@/lib/firebase/history";
import { HistoryList } from "@/components/history/HistoryList";
import type { HistoryEntry } from "@/types/destination";

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user?.phoneNumber) return;
    listHistory(user.phoneNumber).then(setEntries);
  }, [user]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">히스토리</h1>
        <Link href="/" className="text-sm text-orange-400 underline">
          홈으로
        </Link>
      </header>
      {entries === null ? (
        <p className="text-center text-neutral-400">불러오는 중...</p>
      ) : (
        <HistoryList entries={entries} />
      )}
    </main>
  );
}
