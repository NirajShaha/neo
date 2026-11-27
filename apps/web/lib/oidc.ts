import * as client from "openid-client"
import { authConfig } from "./auth-config"
import type { StoredSession } from "./session-store"

const DISCOVERY_TTL_MS = 60 * 60 * 1000

let cached: { config: client.Configuration; fetchedAt: number } | undefined
let inflight: Promise<client.Configuration> | undefined

/** Okta's OIDC metadata and signing keys, cached for an hour. Failures are never cached. */
export async function getOidcConfig(): Promise<client.Configuration> {
  if (cached && Date.now() - cached.fetchedAt < DISCOVERY_TTL_MS) {
    return cached.config
  }
  if (!inflight) {
    const { issuer, clientId, clientSecret } = authConfig()
    // Plain-http issuers (a local mock IdP) are tolerated outside production only; authConfig() rejects them in prod.
    const allowHttp = issuer.startsWith("http://") && process.env.NODE_ENV !== "production"
    inflight = client
      .discovery(
        new URL(issuer),
        clientId,
        clientSecret,
        undefined,
        allowHttp ? { execute: [client.allowInsecureRequests] } : undefined
      )
      .then((config) => {
        cached = { config, fetchedAt: Date.now() }
        return config
      })
      .finally(() => {
        inflight = undefined
      })
  }
  return inflight
}

export function redirectUri(): string {
  return `${authConfig().appUrl}/api/auth/callback`
}

export function toStoredSession(
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
  previous?: StoredSession
): StoredSession {
  const idToken = tokens.id_token ?? previous?.idToken
  if (!tokens.access_token || !idToken) {
    throw new Error("Token response is missing access_token or id_token")
  }
  return {
    accessToken: tokens.access_token,
    idToken,
    // Okta only returns a refresh token on rotation; otherwise keep the one we have.
    refreshToken: tokens.refresh_token ?? previous?.refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + (tokens.expiresIn() ?? 300),
  }
}

/** Exchanges the refresh token for fresh tokens, or returns null when Okta refuses (session is over). */
export async function refreshSession(
  session: StoredSession
): Promise<StoredSession | null> {
  if (!session.refreshToken) {
    return null
  }
  try {
    const config = await getOidcConfig()
    const tokens = await client.refreshTokenGrant(config, session.refreshToken)
    return toStoredSession(tokens, session)
  } catch (error) {
    console.warn("[auth] token refresh failed:", error instanceof Error ? error.message : error)
    return null
  }
}

/** Best-effort revocation so a stolen refresh token dies with the logout. */
export async function revokeRefreshToken(token: string | undefined): Promise<void> {
  if (!token) {
    return
  }
  try {
    const config = await getOidcConfig()
    await client.tokenRevocation(config, token, { token_type_hint: "refresh_token" })
  } catch (error) {
    console.warn("[auth] refresh token revocation failed:", error instanceof Error ? error.message : error)
  }
}

export { client }
