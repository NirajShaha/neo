"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { SESSION_COOKIE } from "@/lib/constants"
import { BACKEND_URL } from "@/lib/session"

const OKTA_ISSUER = process.env.OKTA_ISSUER_URI?.replace(/\/+$/, "")

export async function logoutAction(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  const idToken = store.get("okta_id_token")?.value

  if (token) {
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
    } catch {
      /* best-effort audit trail only: the access token is opaque to us */
    }
  }

  store.delete(SESSION_COOKIE)
  store.delete("okta_id_token")

  if (OKTA_ISSUER && idToken) {
    const endSession = new URL(`${OKTA_ISSUER}/v1/logout`)
    endSession.searchParams.set("id_token_hint", idToken)
    endSession.searchParams.set(
      "post_logout_redirect_uri",
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`
    )
    redirect(endSession.toString())
  }

  redirect("/login")
}
