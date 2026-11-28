import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { createRemoteJWKSet, jwtVerify } from "jose"
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/constants"
import { BACKEND_URL } from "@/lib/session"

const ISSUER = process.env.OKTA_ISSUER_URI?.replace(/\/+$/, "")
const CLIENT_ID = process.env.OKTA_CLIENT_ID
const CLIENT_SECRET = process.env.OKTA_CLIENT_SECRET

const TEMP_COOKIES = [
  "okta_state",
  "okta_nonce",
  "okta_verifier",
  "okta_redirect_uri",
] as const

function loginError(request: NextRequest, message: string): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = "/login"
  url.search = ""
  url.searchParams.set("error", message)
  const response = NextResponse.redirect(url)
  for (const name of TEMP_COOKIES) {
    response.cookies.delete(name)
  }
  return response
}

export async function GET(request: NextRequest) {
  if (!ISSUER || !CLIENT_ID) {
    return loginError(request, "Okta is not configured.")
  }

  const store = await cookies()
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")
  const expectedState = store.get("okta_state")?.value
  const nonce = store.get("okta_nonce")?.value
  const verifier = store.get("okta_verifier")?.value
  const redirectUri = store.get("okta_redirect_uri")?.value
  const oidcError = request.nextUrl.searchParams.get("error_description")
    ?? request.nextUrl.searchParams.get("error")

  if (oidcError) {
    return loginError(request, `Okta sign-in failed: ${oidcError}`)
  }
  if (!code || !state || !expectedState || state !== expectedState || !verifier || !redirectUri) {
    return loginError(request, "Okta sign-in failed. Try again.")
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: CLIENT_ID,
    code_verifier: verifier,
  })
  if (CLIENT_SECRET) {
    body.set("client_secret", CLIENT_SECRET)
  }

  let tokens: { access_token?: string; id_token?: string }
  try {
    const tokenResponse = await fetch(`${ISSUER}/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
      cache: "no-store",
    })
    if (!tokenResponse.ok) {
      return loginError(request, "Could not complete the Okta sign-in. Try again.")
    }
    tokens = (await tokenResponse.json()) as typeof tokens
  } catch {
    return loginError(request, "Could not reach Okta. Try again.")
  }

  const accessToken = tokens.access_token
  if (!accessToken) {
    return loginError(request, "Okta did not return an access token. Try again.")
  }

  if (tokens.id_token) {
    try {
      const jwks = createRemoteJWKSet(new URL(`${ISSUER}/v1/keys`))
      const { payload } = await jwtVerify(tokens.id_token, jwks, {
        issuer: ISSUER,
        audience: CLIENT_ID,
      })
      if (!nonce || payload.nonce !== nonce) {
        return loginError(request, "Okta sign-in failed. Try again.")
      }
    } catch {
      return loginError(request, "Could not verify the Okta sign-in. Try again.")
    }
  }

  try {
    const me = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    })
    if (!me.ok) {
      let detail = "Your Okta account is not authorized for NEO."
      try {
        const problem = (await me.json()) as { detail?: string; title?: string }
        detail = problem.detail ?? problem.title ?? detail
      } catch {
        /* keep default */
      }
      return loginError(request, detail)
    }
  } catch {
    return loginError(request, "Could not reach the NEO backend. Try again.")
  }

  const response = NextResponse.redirect(new URL("/", request.url))
  const secure = request.nextUrl.protocol === "https:"
  response.cookies.set(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure,
  })
  if (tokens.id_token) {
    response.cookies.set("okta_id_token", tokens.id_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
      secure,
    })
  }
  for (const name of TEMP_COOKIES) {
    response.cookies.delete(name)
  }
  return response
}
