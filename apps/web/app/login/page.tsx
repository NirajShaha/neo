import { LogIn } from "lucide-react";
import { safeReturnTo } from "@/lib/return-to";

const messages: Record<string, string> = {
  denied: "Sign-in was cancelled or you don't have access to NEO in Okta.",
  expired: "Your sign-in attempt expired. Please try again.",
  failed: "We couldn't complete the sign-in with Okta. Please try again.",
  account:
    "You signed in with Okta, but NEO has no active account for you. Contact your administrator.",
  backend: "NEO couldn't be reached to finish signing you in. Try again shortly.",
  config:
    "Sign-in is not configured correctly. Contact your administrator.",
  unknown: "Something went wrong while signing in. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  const { error, returnTo } = await searchParams;
  const message = error ? (messages[error] ?? messages.unknown) : null;
  const loginHref = `/api/auth/login?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`;

  return (
    <div className="flex min-h-svh flex-col bg-neutral-100">
      <div className="bg-black px-6 py-6 text-center text-white">
        <h1 className="text-4xl font-black tracking-[0.35em]">NEO</h1>
        <p className="mt-1 text-[11px] font-semibold tracking-[0.25em] text-amber-200/90">
          NEGOTIATION ENTERPRISE ONLINE
        </p>
      </div>

      <main className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm border border-neutral-200 bg-white px-6 py-6 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-900">Sign in</h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Use your company account to continue to the Risk &amp; Opportunity
            Lifecycle.
          </p>

          {message && (
            <p
              role="alert"
              className="mt-4 rounded bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
            >
              {message}
            </p>
          )}

          {/* A plain link on purpose: this starts a full-page redirect to Okta, not a client-side route. */}
          <a
            href={loginHref}
            className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 bg-emerald-800 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <LogIn className="size-3.5" />
            SIGN IN WITH OKTA
          </a>
        </div>
      </main>
    </div>
  );
}
