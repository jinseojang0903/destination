"use client";

import { useMemo, useState } from "react";
import { checkInToday } from "@/lib/firebase/checkIn";
import { todayKST } from "@/lib/checkin/streak";
import { buildMonthCalendar } from "@/lib/checkin/calendar";
import type { UserProfile } from "@/types/user";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

interface Props {
  phoneNumber: string;
  profile: UserProfile;
}

export function CheckInCard({ phoneNumber, profile }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const today = todayKST();
  const checkedInToday = profile.lastCheckInDate === today;
  const days = useMemo(() => buildMonthCalendar(today, profile.checkIns), [today, profile.checkIns]);
  const leadingBlanks = days.length > 0 ? days[0].weekday : 0;

  async function handleClick() {
    if (checkedInToday) {
      setOpen((v) => !v);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await checkInToday(phoneNumber);
      setOpen(true);
      if (result.alreadyCheckedIn) {
        setMessage("오늘은 이미 출석했어요.");
      } else if (result.streakBonusGranted) {
        setMessage(`🎉 연속 ${result.streak}일 달성 보너스! +${result.attemptsGranted}회 획득`);
      } else {
        setMessage(`출석 완료! +${result.attemptsGranted}회 (연속 ${result.streak}일째)`);
      }
    } catch {
      setMessage("출석체크에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">📅 출석체크</p>
          <p className="text-xs text-neutral-500">연속 {profile.checkInStreak}일째 · 7일마다 추가 보너스</p>
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
            checkedInToday ? "border border-neutral-700 text-neutral-300" : "bg-orange-500 text-neutral-950"
          }`}
        >
          {busy ? "..." : checkedInToday ? (open ? "달력 닫기" : "달력 보기") : "출석체크"}
        </button>
      </div>

      {open && (
        <div className="mt-4">
          {message && <p className="mb-3 text-center text-sm text-orange-300">{message}</p>}
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-neutral-500">
            {WEEKDAY_LABELS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {days.map((d) => (
              <div
                key={d.dateStr}
                className={`flex aspect-square items-center justify-center rounded-full text-xs ${
                  d.checkedIn
                    ? "bg-orange-500 font-semibold text-neutral-950"
                    : d.isToday
                      ? "border border-orange-400 text-orange-300"
                      : "text-neutral-500"
                }`}
              >
                {d.day}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
