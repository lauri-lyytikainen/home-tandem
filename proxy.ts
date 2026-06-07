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
    // Note: we deliberately do NOT bounce users away from onboarding just
    // because `sessionClaims.metadata.onboardingComplete` is true. That flag
    // only records "has this person picked a display name" — it's set once
    // and never cleared. Whether someone *currently* needs onboarding also
    // depends on whether they belong to a household, which lives in Convex
    // and isn't visible to middleware (e.g. a user who was removed from
    // their household still has `onboardingComplete: true` but very much
    // needs to go through onboarding again to create/join a new one).
    // `HouseholdGate` + the onboarding page itself decide that, reactively,
    // from live Convex data.
    return NextResponse.next();
  }

  if (!isPublicRoute(req)) {
    if (!userId) {
      return NextResponse.redirect(new URL("/app/welcome", req.url));
    }

    // Brand new users who haven't even picked a display name yet always need
    // onboarding. (Users who *have* a name but lost their household are
    // caught client-side by `HouseholdGate`, since household membership is
    // Convex state that middleware can't see.)
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
