"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { getHistoryEntry } from "@/lib/firebase/history";
import { ResultCard } from "@/components/result/ResultCard";
import { shareOrDownloadNode } from "@/lib/share/buildShareImage";
import { destinationShareText } from "@/lib/format/place";
import type { HistoryEntry } from "@/types/destination";

export default function ResultDetailPage() {
  const { historyId } = useParams<{ historyId: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [entry, setEntry] = useState<HistoryEntry | null | undefined>(undefined);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user?.phoneNumber) return;
    getHistoryEntry(user.phoneNumber, historyId).then(setEntry);
  }, [user, historyId]);

  async function handleShare() {
    if (!cardRef.current || !entry) return;
    setSharing(true);
    try {
      await shareOrDownloadNode(cardRef.current, destinationShareText(entry));
    } finally {
      setSharing(false);
    }
  }

  if (entry === undefined) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-neutral-400">불러오는 중...</p>
      </main>
    );
  }

  if (entry === null) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-neutral-400">기록을 찾을 수 없어요.</p>
        <Link href="/history" className="text-orange-400 underline">
          히스토리로
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <header className="flex items-center justify-between">
        <Link href="/history" className="text-sm text-neutral-400 underline">
          ← 히스토리
        </Link>
      </header>
      <ResultCard ref={cardRef} info={entry} />
      <div className="flex gap-3">
        <button
          onClick={handleShare}
          disabled={sharing}
          className="flex-1 rounded-lg border border-neutral-700 px-4 py-3 font-medium disabled:opacity-50"
        >
          {sharing ? "저장 중..." : "공유하기"}
        </button>
        <Link
          href="/"
          className="flex-1 rounded-lg bg-orange-500 px-4 py-3 text-center font-semibold text-neutral-950"
        >
          홈으로
        </Link>
      </div>
    </main>
  );
}
