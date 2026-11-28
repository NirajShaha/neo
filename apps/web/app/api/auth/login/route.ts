import { randomBytes, createHash } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"

const ISSUER = process.env.OKTA_ISSUER_URI?.replace(/\/+$/, "")
const CLIENT_ID = process.env.OKTA_CLIENT_ID
const SCOPES = process.env.OKTA_SCOPES ?? "openid profile email"

export async function GET(request: NextRequest) {
  if (!ISSUER || !CLIENT_ID) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    url.searchParams.set(
      "error",
      "Okta is not configured. Set OKTA_ISSUER_URI and OKTA_CLIENT_ID."
    )
    return NextResponse.redirect(url)
  }

  const origin = request.nextUrl.origin
  const redirectUri = `${origin}/api/auth/callback`
  const state = randomBytes(32).toString("base64url")
  const nonce = randomBytes(32).toString("base64url")
  const verifier = randomBytes(64).toString("base64url")
  const challenge = createHash("sha256").update(verifier).digest("base64url")

  const authorize = new URL(`${ISSUER}/v1/authorize`)
  authorize.searchParams.set("client_id", CLIENT_ID)
  authorize.searchParams.set("response_type", "code")
  authorize.searchParams.set("scope", SCOPES)
  authorize.searchParams.set("redirect_uri", redirectUri)
  authorize.searchParams.set("state", state)
  authorize.searchParams.set("nonce", nonce)
  authorize.searchParams.set("code_challenge", challenge)
  authorize.searchParams.set("code_challenge_method", "S256")

  const response = NextResponse.redirect(authorize)
  const secure = request.nextUrl.protocol === "https:"
  for (const [name, value] of [
    ["okta_state", state],
    ["okta_nonce", nonce],
    ["okta_verifier", verifier],
    ["okta_redirect_uri", redirectUri],
  ] as const) {
    response.cookies.set(name, value, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
      secure,
    })
  }
  return response
}
