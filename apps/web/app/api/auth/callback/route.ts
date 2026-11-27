import { NextResponse, type NextRequest } from "next/server"
import { authConfig } from "@/lib/auth-config"
import { FLOW_COOKIE } from "@/lib/constants"
import { client, getOidcConfig, redirectUri, toStoredSession } from "@/lib/oidc"
import { unseal } from "@/lib/session-crypto"
import { baseCookieOptions, sessionCookieWrites } from "@/lib/session-store"
import { BACKEND_URL } from "@/lib/session"
import { safeReturnTo } from "@/lib/return-to"

type Flow = { state: string; nonce: string; verifier: string; returnTo: string }

function failure(appUrl: string, code: string): NextResponse {
  const response = NextResponse.redirect(new URL(`/login?error=${code}`, appUrl))
  response.cookies.set(FLOW_COOKIE, "", { ...baseCookieOptions(0), path: "/api/auth" })
  response.headers.set("Cache-Control", "no-store")
  return response
}

/** Okta redirects here with ?code&state. Verifies everything, then establishes the encrypted session. */
export async function GET(request: NextRequest) {
  let appUrl: string
  try {
    appUrl = authConfig().appUrl
  } catch (error) {
    console.error("[auth] misconfigured:", error)
    return NextResponse.redirect(new URL("/login?error=config", request.url))
  }

  const params = request.nextUrl.searchParams
  const oktaError = params.get("error")
  if (oktaError) {
    console.warn("[auth] Okta returned an error:", oktaError, params.get("error_description"))
    return failure(appUrl, oktaError === "access_denied" ? "denied" : "unknown")
  }

  const flow = await unseal<Flow>("flow", request.cookies.get(FLOW_COOKIE)?.value)
  if (!flow) {
    // Missing/expired/tampered flow cookie: stale tab, cookies blocked, or a forged callback.
    return failure(appUrl, "expired")
  }

  let session
  try {
    const config = await getOidcConfig()
    // Rebuild the callback URL from the public base URL: behind a proxy/container request.url is internal.
    const currentUrl = new URL(`${redirectUri()}${request.nextUrl.search}`)
    const tokens = await client.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: flow.verifier,
      expectedState: flow.state,
      expectedNonce: flow.nonce,
      idTokenExpected: true,
    })
    session = toStoredSession(tokens)
  } catch (error) {
    console.warn("[auth] code exchange failed:", error instanceof Error ? error.message : error)
    return failure(appUrl, "failed")
  }

  // Only sign the user in if NEO accepts this identity (valid token, active account, provisioning allowed).
  try {
    const me = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
    })
    if (!me.ok) {
      console.warn("[auth] backend rejected the Okta token:", me.status)
      return failure(appUrl, me.status === 401 || me.status === 403 ? "account" : "backend")
    }
  } catch (error) {
    console.error("[auth] backend unreachable during login:", error)
    return failure(appUrl, "backend")
  }

  const response = NextResponse.redirect(new URL(safeReturnTo(flow.returnTo), appUrl))
  for (const cookie of await sessionCookieWrites(
    session,
    request.cookies.getAll().map((c) => c.name)
  )) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  response.cookies.set(FLOW_COOKIE, "", { ...baseCookieOptions(0), path: "/api/auth" })
  response.headers.set("Cache-Control", "no-store")
  return response
}
