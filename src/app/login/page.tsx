import { redirect } from "next/navigation";
import { FlaskConical, Sparkles } from "lucide-react";
import { getAuthSession } from "@/lib/auth";
import { OtpLoginForm } from "@/components/auth/otp-login-form";

export const metadata = {
  title: "Sign In | Delta Marketing Portal",
  description: "Demo sign-in with instant OTP verification — no real emails sent.",
};

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "Access denied. Please request a new verification code.",
  CredentialsSignin:
    "Invalid or expired verification code. Request a new code and try again.",
  Configuration:
    "Authentication is misconfigured. Check NEXTAUTH_SECRET in .env.local.",
  Default: "Sign-in failed. Please request a new verification code.",
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getAuthSession();
  if (session) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const initialError = params.error
    ? (ERROR_MESSAGES[params.error] ?? ERROR_MESSAGES.Default)
    : null;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full bg-[#0087DC]/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-[420px] w-[420px] rounded-full bg-[#02d5ce]/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-[#a7d33f]/8 blur-3xl" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #0087DC08 1px, transparent 1px), linear-gradient(to bottom, #0087DC08 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0087DC] shadow-lg shadow-[#0087DC]/30">
            <Sparkles className="h-7 w-7 text-white" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0087DC]">
            Delta Electronics
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Marketing Portal
          </h1>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
            Demo mode — enter any email to receive an instant verification code.
            No real emails are sent.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-8 shadow-xl shadow-slate-200/50 backdrop-blur-sm">
          <OtpLoginForm initialError={initialError} />

          <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-[#0087DC]/20 bg-[#0087DC]/5 px-3.5 py-3">
            <FlaskConical
              className="mt-0.5 h-4 w-4 shrink-0 text-[#0087DC]"
              aria-hidden="true"
            />
            <p className="text-xs leading-relaxed text-slate-600">
              <span className="font-semibold text-[#0087DC]">Presentation mode.</span>{" "}
              Codes appear on screen and auto-fill — click Verify & Log In for
              a seamless demo flow.
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          Internal demo environment — not for production use.
        </p>
      </div>
    </div>
  );
}
