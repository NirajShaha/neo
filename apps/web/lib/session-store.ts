import { authConfig } from "./auth-config"
import { SESSION_COOKIE, SESSION_MAX_AGE } from "./constants"
import { seal, unseal } from "./session-crypto"

/** What the browser session holds. It lives only in an encrypted, httpOnly cookie. */
export type StoredSession = {
  accessToken: string
  idToken: string
  refreshToken?: string
  /** Access token expiry, epoch seconds. */
  expiresAt: number
}

/** Browsers cap a cookie at ~4096 bytes including its name and attributes, so values are split. */
const CHUNK_SIZE = 3600

export type CookieWrite = {
  name: string
  value: string
  options: {
    httpOnly: boolean
    secure: boolean
    sameSite: "lax"
    path: string
    maxAge: number
  }
}

export function baseCookieOptions(maxAge: number): CookieWrite["options"] {
  return {
    httpOnly: true,
    secure: authConfig().secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge,
  }
}

function chunkName(index: number): string {
  return `${SESSION_COOKIE}.${index}`
}

export function isSessionCookie(name: string): boolean {
  return name === SESSION_COOKIE || name.startsWith(`${SESSION_COOKIE}.`)
}

/** Reassembles and decrypts the session from a cookie lookup (works for request cookies of any source). */
export async function readSession(
  get: (name: string) => string | undefined
): Promise<StoredSession | null> {
  let sealed = ""
  for (let index = 0; ; index += 1) {
    const part = get(chunkName(index))
    if (part === undefined) {
      break
    }
    sealed += part
  }
  if (!sealed) {
    return null
  }
  const payload = await unseal<StoredSession>("session", sealed)
  if (!payload || typeof payload.accessToken !== "string") {
    return null
  }
  return payload
}

/**
 * Cookie writes that store `session` and clear any leftover chunks from a previously larger session.
 * `existingNames` are the cookie names currently present on the request.
 */
export async function sessionCookieWrites(
  session: StoredSession,
  existingNames: string[]
): Promise<CookieWrite[]> {
  const sealed = await seal("session", { ...session }, SESSION_MAX_AGE)
  const writes: CookieWrite[] = []
  const written = new Set<string>()
  for (let offset = 0, index = 0; offset < sealed.length; offset += CHUNK_SIZE, index += 1) {
    const name = chunkName(index)
    written.add(name)
    writes.push({
      name,
      value: sealed.slice(offset, offset + CHUNK_SIZE),
      options: baseCookieOptions(SESSION_MAX_AGE),
    })
  }
  return [...writes, ...sessionCookieDeletes(existingNames.filter((n) => !written.has(n)))]
}

/** Expires every session cookie in `existingNames` (including the legacy un-chunked name). */
export function sessionCookieDeletes(existingNames: string[]): CookieWrite[] {
  return existingNames.filter(isSessionCookie).map((name) => ({
    name,
    value: "",
    options: baseCookieOptions(0),
  }))
}
