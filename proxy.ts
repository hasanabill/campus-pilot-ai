import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const roleRoutes: Record<string, string[]> = {
  "/admin": ["admin"],
  "/faculty": ["faculty", "admin"],
  "/student": ["student", "admin"],
  "/registrar": ["registrar", "admin"],
};

export default async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const pathname = req.nextUrl.pathname;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const matchedPrefix = Object.keys(roleRoutes).find((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!matchedPrefix) {
    return NextResponse.next();
  }

  const tokenRole = token.role as string | undefined;
  const allowedRoles = roleRoutes[matchedPrefix];
  if (!tokenRole || !allowedRoles.includes(tokenRole)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/faculty/:path*",
    "/student/:path*",
    "/registrar/:path*",
  ],
};
