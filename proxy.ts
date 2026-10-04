import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"];

// Only checks that a session cookie exists; pages and API routes still validate it against the database.
export function proxy(request: NextRequest) {
  const isPublic = PUBLIC_PATHS.includes(request.nextUrl.pathname);
  if (!isPublic && !request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
