import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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

  if (isOnboardingRoute(req)) {
    if (!userId) {
      return NextResponse.redirect(new URL("/app/auth/sign-in", req.url));
    }
    return NextResponse.next();
  }

  if (!isPublicRoute(req)) {
    await auth.protect();

    if (userId && !sessionClaims?.metadata?.onboardingComplete) {
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
