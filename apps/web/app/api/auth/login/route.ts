import { NextResponse, type NextRequest } from "next/server"
import { authConfig } from "@/lib/auth-config"
import { FLOW_COOKIE } from "@/lib/constants"
import { client, getOidcConfig, redirectUri } from "@/lib/oidc"
import { seal } from "@/lib/session-crypto"
import { safeReturnTo } from "@/lib/return-to"
import { baseCookieOptions } from "@/lib/session-store"

const FLOW_TTL_SECONDS = 10 * 60

/** Starts the Okta sign-in: Authorization Code flow with PKCE, state and nonce. */
export async function GET(request: NextRequest) {
  try {
    const config = await getOidcConfig()
    const { scope } = authConfig()

    const verifier = client.randomPKCECodeVerifier()
    const state = client.randomState()
    const nonce = client.randomNonce()
    const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"))

    const authorizationUrl = client.buildAuthorizationUrl(config, {
      redirect_uri: redirectUri(),
      scope,
      state,
      nonce,
      code_challenge: await client.calculatePKCECodeChallenge(verifier),
      code_challenge_method: "S256",
    })

    const response = NextResponse.redirect(authorizationUrl)
    response.cookies.set(FLOW_COOKIE, await seal("flow", { state, nonce, verifier, returnTo }, FLOW_TTL_SECONDS), {
      ...baseCookieOptions(FLOW_TTL_SECONDS),
      path: "/api/auth",
    })
    response.headers.set("Cache-Control", "no-store")
    return response
  } catch (error) {
    console.error("[auth] could not start login:", error)
    const { appUrl } = authConfigSafe()
    return NextResponse.redirect(new URL("/login?error=config", appUrl ?? request.url))
  }
}

function authConfigSafe(): { appUrl?: string } {
  try {
    return { appUrl: authConfig().appUrl }
  } catch {
    return {}
  }
}
