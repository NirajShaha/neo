import { LogIn } from "lucide-react"
import { Button } from "@workspace/ui/components/button"

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>
}) {
  const params = (await searchParams) ?? {}
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
          <p className="mt-0.5 text-xs text-muted-foreground">
            Use your Okta account to continue to the Risk &amp; Opportunity
            Lifecycle.
          </p>

          {params.error && (
            <p className="mt-4 rounded bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {params.error}
            </p>
          )}

          <a href="/api/auth/login" className="mt-4 block">
            <Button className="w-full bg-emerald-800 text-xs font-bold text-white hover:bg-emerald-700">
              <LogIn className="size-3.5" />
              SIGN IN WITH OKTA
            </Button>
          </a>
        </div>
      </main>
    </div>
  )
}
