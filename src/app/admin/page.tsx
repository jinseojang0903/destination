"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/AuthProvider";
import {
  checkIsAdmin,
  listAllAttemptRequests,
  approveAttemptRequest,
  rejectAttemptRequest,
} from "@/lib/firebase/attemptRequests";
import type { AttemptRequest } from "@/types/attemptRequest";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [requests, setRequests] = useState<AttemptRequest[] | null>(null);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  const refresh = useCallback(() => {
    listAllAttemptRequests().then(setRequests);
  }, []);

  useEffect(() => {
    if (!user?.phoneNumber) return;
    checkIsAdmin(user.phoneNumber).then(setIsAdmin);
  }, [user]);

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin, refresh]);

  async function handleApprove(req: AttemptRequest) {
    setBusyId(req.id);
    setActionError(null);
    try {
      await approveAttemptRequest(req.id, req.phoneNumber, amounts[req.id] ?? 1);
      refresh();
    } catch (err) {
      console.error("approveAttemptRequest failed", err);
      const code = err instanceof Error && "code" in err ? String((err as { code: unknown }).code) : "";
      setActionError(`승인에 실패했어요${code ? ` (${code})` : ""}. 콘솔을 확인해주세요.`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(req: AttemptRequest) {
    setBusyId(req.id);
    setActionError(null);
    try {
      await rejectAttemptRequest(req.id);
      refresh();
    } catch (err) {
      console.error("rejectAttemptRequest failed", err);
      const code = err instanceof Error && "code" in err ? String((err as { code: unknown }).code) : "";
      setActionError(`거절에 실패했어요${code ? ` (${code})` : ""}. 콘솔을 확인해주세요.`);
    } finally {
      setBusyId(null);
    }
  }

  if (loading || isAdmin === null) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-neutral-400">확인 중...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-neutral-400">이 페이지에 접근할 권한이 없어요.</p>
        <Link href="/" className="text-orange-400 underline">
          홈으로
        </Link>
      </main>
    );
  }

  const pending = requests?.filter((r) => r.status === "pending") ?? [];
  const resolved = requests?.filter((r) => r.status !== "pending") ?? [];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">기회 요청 관리</h1>
        <Link href="/" className="text-sm text-orange-400 underline">
          홈으로
        </Link>
      </header>

      {actionError && <p className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">{actionError}</p>}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-400">대기 중 ({pending.length})</h2>
        {pending.length === 0 && <p className="text-sm text-neutral-500">대기 중인 요청이 없어요.</p>}
        {pending.map((req) => (
          <div key={req.id} className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm">
            <p className="font-medium">
              {req.displayName} <span className="text-neutral-500">({req.phoneNumber})</span>
            </p>
            <p className="mt-1 text-neutral-300">{req.reason}</p>
            <p className="mt-1 text-xs text-neutral-500">{new Date(req.createdAt).toLocaleString("ko-KR")}</p>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={amounts[req.id] ?? 1}
                onChange={(e) => setAmounts((prev) => ({ ...prev, [req.id]: Number(e.target.value) || 1 }))}
                className="w-16 rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1 text-center"
              />
              <span className="text-xs text-neutral-500">회 부여</span>
              <button
                type="button"
                onClick={() => handleApprove(req)}
                disabled={busyId === req.id}
                className="ml-auto rounded-lg bg-green-600 px-3 py-1.5 font-semibold text-neutral-950 disabled:opacity-50"
              >
                승인
              </button>
              <button
                type="button"
                onClick={() => handleReject(req)}
                disabled={busyId === req.id}
                className="rounded-lg border border-neutral-700 px-3 py-1.5 disabled:opacity-50"
              >
                거절
              </button>
            </div>
          </div>
        ))}
      </section>

      {resolved.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-neutral-400">처리 완료</h2>
          {resolved.map((req) => (
            <div key={req.id} className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 text-xs text-neutral-400">
              <span className="font-medium text-neutral-300">{req.displayName}</span> — {req.reason} —{" "}
              <span className={req.status === "approved" ? "text-green-400" : "text-red-400"}>
                {req.status === "approved" ? `승인 (+${req.grantedAmount})` : "거절"}
              </span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
