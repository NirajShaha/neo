/** Base name of the encrypted session cookie; large sessions are split into `${name}.0`, `${name}.1`, ... */
export const SESSION_COOKIE = "neo_session"

/** Short-lived cookie that carries state/nonce/PKCE verifier across the redirect to Okta and back. */
export const FLOW_COOKIE = "neo_oidc"

/** Hard cap on a browser session, regardless of token lifetimes. */
export const SESSION_MAX_AGE = 60 * 60 * 8

/** Seconds before access-token expiry at which the session is refreshed. */
export const REFRESH_LEEWAY = 60

export function backendPath(path: string): string {
  return `/api/backend${path}`
}
