export const SESSION_COOKIE = "neo_session"

export const SESSION_MAX_AGE = 60 * 60 * 24

export function backendPath(path: string): string {
  return `/api/backend${path}`
}
