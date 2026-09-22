"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { getUserProfile, createUserProfile } from "@/lib/firebase/attempts";
import { normalizePhoneNumber } from "@/lib/phone/normalizePhoneNumber";

type Step = "phone" | "code";

function friendlyError(err: unknown): string {
  console.error("phone auth error", err);
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
            disabled={submitting}
            className="rounded-lg bg-orange-500 px-4 py-3 font-semibold text-neutral-950 disabled:opacity-50"
          >
            {submitting ? "전송 중..." : "인증번호 받기"}
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
