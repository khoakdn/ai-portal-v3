"use client";

import { signIn } from "next-auth/react";
import { Loader2, Mail, KeyRound, AlertCircle, FlaskConical } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "email" | "code";

interface OtpLoginFormProps {
  initialError?: string | null;
}

export function OtpLoginForm({ initialError }: OtpLoginFormProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [mockCode, setMockCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialError ?? "");

  async function requestCode() {
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!trimmed.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setMockCode(null);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        mockCode?: string;
        error?: string;
      };

      if (!res.ok || !data.success) {
        setErrorMessage(data.error ?? "Could not generate verification code.");
        return;
      }

      setEmail(trimmed);
      setStep("code");

      if (data.mockCode) {
        setMockCode(data.mockCode);
        setCode(data.mockCode);
      } else {
        setCode("");
      }
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    await requestCode();
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const trimmedCode = code.trim();

    if (!/^\d{6}$/.test(trimmedCode)) {
      setErrorMessage("Enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const result = await signIn("credentials", {
        email,
        code: trimmedCode,
        callbackUrl: "/dashboard",
        redirect: false,
      });

      if (result?.error) {
        setErrorMessage(
          result.error === "CredentialsSignin"
            ? "Invalid or expired code. Request a new one and try again."
            : "Sign-in failed. Please try again."
        );
        setLoading(false);
        return;
      }

      if (result?.url) {
        window.location.href = result.url;
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  function handleChangeEmail() {
    setStep("email");
    setCode("");
    setMockCode(null);
    setErrorMessage("");
  }

  const demoBanner = mockCode ? (
    <DemoModeBanner code={mockCode} />
  ) : null;

  if (step === "code") {
    return (
      <form onSubmit={handleVerify} className="space-y-5">
        {demoBanner}

        <div className="space-y-2">
          <Label htmlFor="email-locked" className="text-sm font-medium text-slate-700">
            Email
          </Label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              id="email-locked"
              type="email"
              value={email}
              readOnly
              disabled
              className="h-11 cursor-not-allowed bg-slate-50 pl-10 text-slate-600"
            />
          </div>
          <button
            type="button"
            onClick={handleChangeEmail}
            className="text-xs font-medium text-[#0087DC] hover:text-[#006db3]"
          >
            Use a different email
          </button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="code" className="text-sm font-medium text-slate-700">
            Verification code
          </Label>
          <div className="relative">
            <KeyRound
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={loading}
              className="h-11 pl-10 text-center text-lg tracking-[0.4em] font-semibold"
              required
              autoFocus
            />
          </div>
          <p className="text-xs text-slate-400">
            Demo mode — code pre-filled for instant verification
          </p>
        </div>

        {errorMessage && <ErrorBanner message={errorMessage} />}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0087DC] px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-[#0087DC]/25 transition-all duration-200 hover:bg-[#006db3] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              Verifying…
            </>
          ) : (
            "Verify & Log In"
          )}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => requestCode()}
          className="w-full text-center text-sm text-slate-500 hover:text-[#0087DC] disabled:opacity-50"
        >
          Generate new code
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleRequestCode} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-slate-700">
          Email address
        </Label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@any-domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="h-11 pl-10"
            required
          />
        </div>
        <p className="text-xs text-slate-400">
          Demo mode — any email address works, no real emails sent
        </p>
      </div>

      {errorMessage && <ErrorBanner message={errorMessage} />}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0087DC] px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-[#0087DC]/25 transition-all duration-200 hover:bg-[#006db3] hover:shadow-xl hover:shadow-[#0087DC]/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Generating code…
          </>
        ) : (
          "Request Code"
        )}
      </button>
    </form>
  );
}

function DemoModeBanner({ code }: { code: string }) {
  return (
    <div
      role="status"
      className="rounded-xl border-2 border-[#0087DC]/30 bg-gradient-to-r from-[#0087DC]/10 to-[#02d5ce]/10 px-4 py-3.5 shadow-sm"
    >
      <div className="flex items-start gap-2.5">
        <FlaskConical
          className="mt-0.5 h-4 w-4 shrink-0 text-[#0087DC]"
          aria-hidden="true"
        />
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#0087DC]">
            Demo Mode
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            🧪 [DEMO MODE] Code sent! Use verification code:{" "}
            <span className="font-mono text-base tracking-widest text-[#006db3]">
              {code}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3.5 py-3">
      <AlertCircle
        className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
        aria-hidden="true"
      />
      <p className="text-xs leading-relaxed text-red-700">{message}</p>
    </div>
  );
}
