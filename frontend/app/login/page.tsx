"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const demoUsers = [
  { email: "manager1@neo.dev", role: "Manager (supervisors)" },
  { email: "finance1@neo.dev", role: "Finance" },
  { email: "employee1@neo.dev", role: "Buyer (employees)" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("manager1@neo.dev");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setPending(false);
    if (result?.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Invalid email or password.");
    }
  };

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
            Use your NEO account to continue to the Risk &amp; Opportunity
            Lifecycle.
          </p>

          <form onSubmit={submit} className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[11px] font-bold text-neutral-700">
                EMAIL
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-8 text-xs"
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[11px] font-bold text-neutral-700">
                PASSWORD
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-8 text-xs"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p className="rounded bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={pending}
              className="w-full bg-emerald-800 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <LogIn className="size-3.5" />
              {pending ? "SIGNING IN…" : "SIGN IN"}
            </Button>
          </form>

          <div className="mt-4 border-t border-neutral-200 pt-3">
            <p className="text-[11px] font-bold text-neutral-700">
              Demo accounts (password: password)
            </p>
            <ul className="mt-1 space-y-1">
              {demoUsers.map((u) => (
                <li key={u.email}>
                  <button
                    type="button"
                    onClick={() => setEmail(u.email)}
                    className="text-xs text-emerald-800 hover:underline"
                  >
                    {u.email}
                  </button>{" "}
                  <span className="text-[11px] text-neutral-500">
                    — {u.role}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
