"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { subscribeUserProfile } from "@/lib/firebase/attempts";
import type { UserProfile } from "@/types/user";
import type { RegionSelection } from "@/types/destination";
import { RegionPicker } from "@/components/region/RegionPicker";
import { PracticeToggle } from "@/components/common/PracticeToggle";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [region, setRegion] = useState<RegionSelection | null>(null);
  const [practice, setPractice] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeUserProfile(user.uid, setProfile);
  }, [user]);

  function handleStart() {
    if (!region) return;
    const params = new URLSearchParams();
    params.set("regionType", region.type);
    params.set("regionValue", region.type === "continent" ? region.continent : region.iso3);
    params.set("practice", practice ? "1" : "0");
    router.push(`/throw?${params.toString()}`);
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-neutral-400">불러오는 중...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center">
        <h1 className="text-3xl font-bold">🎯 다트 여행</h1>
        <p className="max-w-xs text-neutral-400">
          새총으로 지도에 다트를 던져서, 찍힌 곳으로 다음 여행을 떠나보세요.
        </p>
        <Link href="/login" className="rounded-lg bg-orange-500 px-6 py-3 font-semibold text-neutral-950">
          휴대폰 번호로 시작하기
        </Link>
      </main>
    );
  }

  const officialDisabled = !region || (profile?.attemptsRemaining ?? 0) <= 0;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">🎯 다트 여행</h1>
          <p className="text-sm text-neutral-400">{profile?.phoneNumber ?? user.phoneNumber}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/history" className="text-sm text-orange-400 underline">
            히스토리
          </Link>
          <button
            onClick={() => signOut(auth)}
            className="text-sm text-neutral-400 underline"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm">
        공식 시도 남은 횟수: <span className="font-bold text-orange-400">{profile?.attemptsRemaining ?? 0}</span>회
        {(profile?.attemptsRemaining ?? 0) <= 0 && (
          <p className="mt-1 text-xs text-neutral-500">
            공식 시도를 모두 사용했어요. 추가 기회는 연습 모드로만 즐길 수 있어요.
          </p>
        )}
      </div>

      <RegionPicker value={region} onChange={setRegion} />

      <PracticeToggle checked={practice} onChange={setPractice} />

      <button
        type="button"
        onClick={handleStart}
        disabled={!region || (!practice && officialDisabled)}
        className="rounded-lg bg-orange-500 px-4 py-4 text-lg font-bold text-neutral-950 disabled:opacity-40"
      >
        {practice ? "연습 던지기 시작" : "공식 던지기 시작"}
      </button>
    </main>
  );
}
