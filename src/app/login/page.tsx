"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { getUserProfile, createUserProfile } from "@/lib/firebase/attempts";
import { isPhoneAuthEnabled } from "@/lib/firebase/systemStatus";
import { normalizePhoneNumber } from "@/lib/phone/normalizePhoneNumber";

const RESEND_COOLDOWN_SECONDS = 60;

type Step = "phone" | "code";

function friendlyError(err: unknown): string {
  console.error("phone auth error", err);
  Sentry.captureException(err);
  const code = err instanceof Error && "code" in err ? String((err as { code: unknown }).code) : "";
  if (code === "auth/invalid-phone-number") return "휴대폰 번호 형식을 확인해주세요.";
  if (code === "auth/too-many-requests") return "요청이 너무 많아요. 잠시 후 다시 시도해주세요.";
  if (code === "auth/invalid-verification-code") return "인증번호가 올바르지 않아요.";
  if (code === "auth/code-expired") return "인증번호가 만료됐어요. 다시 받아주세요.";
  const message = err instanceof Error ? err.message : String(err);
  return `요청에 실패했어요: ${code || message}`;
}

export default function LoginPage() {
  const router = useRouter();
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  const [step, setStep] = useState<Step>("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Manual on/off switch, checked before rendering the form at all — see
  // src/lib/firebase/systemStatus.ts for how to flip it on.
  const [locked, setLocked] = useState<boolean | null>(null);
  // Each "인증번호 받기" click sends a real, billable SMS — this cooldown
  // stops accidental double-clicks / reconnect-and-retry from sending
  // several for the same login attempt. Persists across the phone<->code
  // step toggle, not just while the "phone" form is showing. Tracked as a
  // target timestamp (not a counting-down number) so it stays correct even
  // if the tab is backgrounded and timers get throttled.
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    isPhoneAuthEnabled().then((enabled) => setLocked(!enabled));
  }, []);

  useEffect(() => {
    if (!cooldownUntil) return;
    const tick = () => setCooldownRemaining(Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  function getVerifier(): RecaptchaVerifier {
    if (!verifierRef.current && recaptchaContainerRef.current) {
      verifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        size: "invisible",
      });
    }
    return verifierRef.current!;
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (locked || cooldownRemaining > 0) return;

    const normalized = normalizePhoneNumber(phoneInput);
    if (!normalized) {
      setError("휴대폰 번호를 정확히 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const verifier = getVerifier();
      confirmationRef.current = await signInWithPhoneNumber(auth, normalized, verifier);
      setStep("code");
      setCooldownUntil(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
    } catch (err) {
      setError(friendlyError(err));
      verifierRef.current?.clear();
      verifierRef.current = null;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!confirmationRef.current) return;

    setSubmitting(true);
    try {
      const cred = await confirmationRef.current.confirm(code);
      const phoneNumber = cred.user.phoneNumber;
      if (!phoneNumber) throw new Error("전화번호를 확인할 수 없어요.");
      const existing = await getUserProfile(phoneNumber);
      if (!existing) {
        await createUserProfile(phoneNumber);
      }
      router.push("/");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (locked === null) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-neutral-400">불러오는 중...</p>
      </main>
    );
  }

  if (locked) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-bold">🎯 다트 여행</h1>
        <p className="max-w-xs text-neutral-400">
          현재 신규 로그인이 잠시 중단되어 있어요. 준비되면 다시 열릴 예정이에요.
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-bold">🎯 다트 여행</h1>
      <p className="max-w-xs text-center text-sm text-neutral-400">
        휴대폰 번호로 인증하면 계정이 자동으로 만들어져요. 번호당 공식 던지기 1회가 주어져요.
      </p>

      {step === "phone" && (
        <form onSubmit={handleSendCode} className="flex w-full max-w-xs flex-col gap-3">
          <input
            type="tel"
            required
            autoComplete="tel"
            placeholder="010-1234-5678"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-base outline-none focus:border-neutral-400"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting || cooldownRemaining > 0}
            className="rounded-lg bg-orange-500 px-4 py-3 font-semibold text-neutral-950 disabled:opacity-50"
          >
            {submitting
              ? "전송 중..."
              : cooldownRemaining > 0
                ? `${cooldownRemaining}초 후 재전송 가능`
                : "인증번호 받기"}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={handleConfirmCode} className="flex w-full max-w-xs flex-col gap-3">
          <p className="text-center text-sm text-neutral-400">{phoneInput}로 전송된 인증번호를 입력하세요.</p>
          <input
            type="text"
            inputMode="numeric"
            required
            autoComplete="one-time-code"
            placeholder="6자리 인증번호"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-center text-lg tracking-widest outline-none focus:border-neutral-400"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-orange-500 px-4 py-3 font-semibold text-neutral-950 disabled:opacity-50"
          >
            {submitting ? "확인 중..." : "확인"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setCode("");
              setError(null);
            }}
            className="text-sm text-neutral-400 underline"
          >
            번호 다시 입력하기
          </button>
        </form>
      )}

      {/* Invisible reCAPTCHA anchor required by Firebase Phone Auth */}
      <div ref={recaptchaContainerRef} />
    </main>
  );
}
