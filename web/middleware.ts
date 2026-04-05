import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const PROTECTED_ROUTES = [
  "/",
  "/chat",
  "/calendar",
  "/drive",
  "/docs",
  "/sheets",
  "/settings",
  "/admin",
];

const ADMIN_ROUTES = ["/admin"];

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session;

  const isProtected = PROTECTED_ROUTES.some(
    (route) =>
      nextUrl.pathname === route || nextUrl.pathname.startsWith(`${route}/`)
  );

  // Redirect unauthenticated users trying to access protected routes
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return Response.redirect(loginUrl);
  }

  // Admin-only route protection – check the role stored in the JWT
  if (isLoggedIn && ADMIN_ROUTES.some((r) => nextUrl.pathname.startsWith(r))) {
    const role = (session.user as { role?: string }).role;
    if (role !== "ADMIN") {
      return Response.redirect(new URL("/", nextUrl.origin));
    }
  }

  // Redirect logged-in users away from the login page
  if (isLoggedIn && nextUrl.pathname === "/login") {
    return Response.redirect(new URL("/", nextUrl.origin));
  }
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

