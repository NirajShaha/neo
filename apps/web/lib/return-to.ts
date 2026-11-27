/** Only same-site relative paths may be used as a post-login destination (prevents open redirects). */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/"
  }
  if (value.startsWith("/api/") || value.startsWith("/login")) {
    return "/"
  }
  return value
}
