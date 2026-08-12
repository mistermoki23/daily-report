import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/auth/session-token";

const PUBLIC_PAGES = ["/login", "/register"];
const PUBLIC_API = ["/api/auth/login", "/api/auth/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".") // static files
  ) {
    return NextResponse.next();
  }

  const isPublicPage = PUBLIC_PAGES.some((p) => pathname === p);
  const isPublicApi = PUBLIC_API.some((p) => pathname === p);
  const isApi = pathname.startsWith("/api");

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (isApi) {
    if (isPublicApi) return NextResponse.next();
    if (!session) {
      return NextResponse.json(
        { error: "Требуется авторизация" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  if (!session && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (session && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (session && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
