import { hkdfSync } from "node:crypto"
import { EncryptJWT, jwtDecrypt } from "jose"
import { authConfig } from "./auth-config"

/** Separate keys per purpose so a flow cookie can never be replayed as a session cookie (and vice versa). */
export type Purpose = "session" | "flow"

function key(purpose: Purpose): Uint8Array {
  const derived = hkdfSync(
    "sha256",
    authConfig().sessionSecret,
    "neo-web-cookies",
    purpose,
    32
  )
  return new Uint8Array(derived)
}

/** Encrypts and authenticates a payload (JWE, A256GCM) that expires after `ttlSeconds`. */
export async function seal(
  purpose: Purpose,
  payload: Record<string, unknown>,
  ttlSeconds: number
): Promise<string> {
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM", typ: purpose })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .encrypt(key(purpose))
}

/** Returns the payload, or null when the value is missing, tampered with, expired or of another purpose. */
export async function unseal<T>(
  purpose: Purpose,
  value: string | undefined
): Promise<T | null> {
  if (!value) {
    return null
  }
  try {
    const { payload, protectedHeader } = await jwtDecrypt(value, key(purpose), {
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
    })
    if (protectedHeader.typ !== purpose) {
      return null
    }
    return payload as T
  } catch {
    return null
  }
}
