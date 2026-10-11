import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

type Role = "ADMIN" | "PRESIDENT" | "COUNCILOR"

const ROLE_HIERARCHY: Record<Role, Role[]> = {
  ADMIN: ["ADMIN"],
  PRESIDENT: ["ADMIN", "PRESIDENT"],
  COUNCILOR: ["ADMIN", "PRESIDENT", "COUNCILOR"],
}

function hasRequiredRole(userRole: Role | undefined, required: Role): boolean {
  if (!userRole) return false
  return ROLE_HIERARCHY[required]?.includes(userRole) ?? false
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    let requiredRole: Role | null = null
    if (pathname.startsWith("/admin")) requiredRole = "ADMIN"
    else if (pathname.startsWith("/president")) requiredRole = "PRESIDENT"
    else if (pathname.startsWith("/councilor")) requiredRole = "COUNCILOR"

    if (requiredRole && !hasRequiredRole(token?.role as Role | undefined, requiredRole)) {
      const loginUrl = new URL("/login", req.url)
      loginUrl.searchParams.set("callbackUrl", req.url)
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ["/admin/:path*", "/president/:path*", "/councilor/:path*"],
}
