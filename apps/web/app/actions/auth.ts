"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { authConfig } from "@/lib/auth-config"
import { client, getOidcConfig, revokeRefreshToken } from "@/lib/oidc"
import { readSession, sessionCookieDeletes } from "@/lib/session-store"
import { BACKEND_URL } from "@/lib/session"

/**
 * Ends the NEO session and the Okta session (RP-initiated logout), so "sign out" really signs the user out of SSO.
 * Runs as a Server Action, which Next.js protects with an Origin check (no CSRF-able GET logout).
 */
export async function logoutAction(): Promise<void> {
  const store = await cookies()
  const session = await readSession((name) => store.get(name)?.value)

  if (session) {
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}` },
        cache: "no-store",
      })
    } catch {
      /* audit trail only: the API holds no session */
    }
    await revokeRefreshToken(session.refreshToken)
  }

  for (const cookie of sessionCookieDeletes(store.getAll().map((c) => c.name))) {
    store.set(cookie.name, cookie.value, cookie.options)
  }

  let destination = "/login"
  if (session) {
    try {
      const config = await getOidcConfig()
      destination = client
        .buildEndSessionUrl(config, {
          id_token_hint: session.idToken,
          post_logout_redirect_uri: `${authConfig().appUrl}/login`,
        })
        .toString()
    } catch (error) {
      console.warn("[auth] no Okta end-session endpoint, signing out locally only:", error)
    }
  }
  redirect(destination)
}
