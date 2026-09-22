"use client";

import { useEffect, useState } from "react";
import { createAttemptRequest, listOwnAttemptRequests } from "@/lib/firebase/attemptRequests";
import type { AttemptRequest, AttemptRequestStatus } from "@/types/attemptRequest";

const STATUS_LABEL: Record<AttemptRequestStatus, string> = {
  pending: "검토 중",
  approved: "승인됨",
  rejected: "거절됨",
};

const STATUS_CLASS: Record<AttemptRequestStatus, string> = {
  pending: "text-neutral-400",
  approved: "text-green-400",
  rejected: "text-red-400",
};

export function RequestAttemptsForm({ phoneNumber }: { phoneNumber: string }) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<AttemptRequest[] | null>(null);

  useEffect(() => {
    listOwnAttemptRequests(phoneNumber).then(setRequests);
  }, [phoneNumber]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!displayName.trim() || !reason.trim()) {
      setError("이름과 사유를 모두 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await createAttemptRequest(phoneNumber, displayName.trim(), reason.trim());
      setDisplayName("");
      setReason("");
      setOpen(false);
      setRequests(await listOwnAttemptRequests(phoneNumber));
    } catch {
      setError("요청을 보내지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left font-medium text-orange-400"
      >
        {open ? "▲ " : "▼ "}관리자에게 기회 달라고 조르기
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
          <input
            type="text"
            placeholder="이름"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-neutral-400"
          />
          <textarea
            placeholder="사유 (예: 한 번 더 해보고 싶어요!)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="resize-none rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-neutral-400"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-orange-500 px-3 py-2 font-semibold text-neutral-950 disabled:opacity-50"
          >
            {submitting ? "보내는 중..." : "요청 보내기"}
          </button>
        </form>
      )}

      {requests && requests.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 border-t border-neutral-800 pt-3 text-xs">
          {requests.map((r) => (
            <li key={r.id} className="flex items-center justify-between">
              <span className="truncate text-neutral-400">{r.reason}</span>
              <span className={`ml-2 shrink-0 font-medium ${STATUS_CLASS[r.status]}`}>
                {STATUS_LABEL[r.status]}
                {r.status === "approved" && r.grantedAmount ? ` +${r.grantedAmount}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
