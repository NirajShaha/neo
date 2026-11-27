import { NextResponse, type NextRequest } from "next/server"
import { REFRESH_LEEWAY } from "@/lib/constants"
import { refreshSession } from "@/lib/oidc"
import {
  isSessionCookie,
  readSession,
  sessionCookieDeletes,
  sessionCookieWrites,
  type CookieWrite,
} from "@/lib/session-store"

const PUBLIC_PATHS = ["/login", "/api/auth"]

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

function unauthenticated(request: NextRequest, cookiesToClear: CookieWrite[]): NextResponse {
  const { pathname, search } = request.nextUrl
  let response: NextResponse
  if (pathname.startsWith("/api/")) {
    // XHR/fetch/SSE callers need a status code, not an HTML redirect.
    response = NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  } else {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = pathname === "/" ? "" : `?returnTo=${encodeURIComponent(pathname + search)}`
    response = NextResponse.redirect(url)
  }
  for (const cookie of cookiesToClear) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  return response
}

/**
 * Gate for every page and API call. Public: /login and /api/auth/*. Everything else needs a valid encrypted session
 * cookie. The access token is refreshed here, ahead of expiry, so pages and the API proxy always see a live token.
 */
export async function proxy(request: NextRequest) {
  if (isPublic(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  const existing = request.cookies.getAll().map((cookie) => cookie.name)
  const session = await readSession((name) => request.cookies.get(name)?.value)
  if (!session) {
    return unauthenticated(request, sessionCookieDeletes(existing.filter(isSessionCookie)))
  }

  const now = Math.floor(Date.now() / 1000)
  if (session.expiresAt - now > REFRESH_LEEWAY) {
    return NextResponse.next()
  }

  const refreshed = await refreshSession(session)
  if (!refreshed) {
    return unauthenticated(request, sessionCookieDeletes(existing))
  }

  // Persist the new tokens AND make them visible to this very request (pages/route handlers read request cookies).
  const writes = await sessionCookieWrites(refreshed, existing)
  const forwarded = request.cookies
    .getAll()
    .filter((cookie) => !isSessionCookie(cookie.name))
    .map((cookie) => `${cookie.name}=${cookie.value}`)
  for (const write of writes) {
    if (write.value) {
      forwarded.push(`${write.name}=${write.value}`)
    }
  }
  const headers = new Headers(request.headers)
  headers.set("cookie", forwarded.join("; "))

  const response = NextResponse.next({ request: { headers } })
  for (const write of writes) {
    response.cookies.set(write.name, write.value, write.options)
  }
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|storage).*)"],
}
