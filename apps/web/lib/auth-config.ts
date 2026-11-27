export type AuthConfig = {
  issuer: string
  clientId: string
  clientSecret: string
  scope: string
  /** Public base URL of this web app, e.g. https://neo.example.com (no trailing slash). */
  appUrl: string
  sessionSecret: string
  secureCookies: boolean
}

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is not set. See apps/web/.env.example.`)
  }
  return value
}

let cached: AuthConfig | undefined

/** Reads and validates the Okta/session settings once. Throws a descriptive error when misconfigured. */
export function authConfig(): AuthConfig {
  if (cached) {
    return cached
  }

  const appUrl = (
    process.env.APP_URL?.trim() ||
    (process.env.NODE_ENV === "production" ? required("APP_URL") : "http://localhost:3000")
  ).replace(/\/+$/, "")

  const sessionSecret = required("NEO_SESSION_SECRET")
  if (sessionSecret.length < 32) {
    throw new Error("NEO_SESSION_SECRET must be at least 32 characters (try: openssl rand -base64 48).")
  }

  const issuer = required("OKTA_ISSUER").replace(/\/+$/, "")
  if (process.env.NODE_ENV === "production" && !issuer.startsWith("https://")) {
    throw new Error("OKTA_ISSUER must use https in production.")
  }

  cached = {
    issuer,
    clientId: required("OKTA_CLIENT_ID"),
    clientSecret: required("OKTA_CLIENT_SECRET"),
    scope: process.env.OKTA_SCOPES?.trim() || "openid profile email groups offline_access",
    appUrl,
    sessionSecret,
    secureCookies: appUrl.startsWith("https://"),
  }
  return cached
}
