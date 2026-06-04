import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAuthRoute = createRouteMatcher([
  "/app/auth/sign-in(.*)",
  "/app/auth/sign-up(.*)",
  "/app/welcome(.*)",
]);

const isPublicRoute = createRouteMatcher([
  "/app/auth/sign-in(.*)",
  "/app/auth/sign-up(.*)",
  "/app/welcome(.*)",
  "/j/(.*)",
  "/",
]);

const isOnboardingRoute = createRouteMatcher(["/app/onboarding(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // Authenticated users shouldn't see auth/welcome pages
  if (userId && isAuthRoute(req)) {
    const dest = sessionClaims?.metadata?.onboardingComplete
      ? "/app"
      : "/app/onboarding";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  if (isOnboardingRoute(req)) {
    if (!userId) {
      return NextResponse.redirect(new URL("/app/welcome", req.url));
    }
    if (sessionClaims?.metadata?.onboardingComplete) {
      return NextResponse.redirect(new URL("/app", req.url));
    }
    return NextResponse.next();
  }

  if (!isPublicRoute(req)) {
    if (!userId) {
      return NextResponse.redirect(new URL("/app/welcome", req.url));
    }

    if (!sessionClaims?.metadata?.onboardingComplete) {
      return NextResponse.redirect(new URL("/app/onboarding", req.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for Clerk's auto-proxy path
    "/__clerk/:path*",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
