"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// Routes that must stay reachable even for a user who isn't (or no longer
// is) part of a household — e.g. someone who was just kicked still needs to
// reach onboarding, their profile, or auth screens.
const EXEMPT_PREFIXES = ["/app/onboarding", "/app/auth", "/app/profile"];

// Wraps every page under /app and makes sure that anyone without a household
// — whether brand new or removed from one (kicked) — is redirected back
// through onboarding instead of getting stuck on a page that has nothing to
// show them.
export default function HouseholdGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  const exempt = EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // Skip the query entirely on exempt routes / while signed out — no point
  // subscribing to household state where it doesn't matter.
  const household = useQuery(
    api.households.getMyHousehold,
    isLoaded && isSignedIn && !exempt ? {} : "skip"
  );

  useEffect(() => {
    if (exempt) return;
    if (household === null) router.replace("/app/onboarding");
  }, [exempt, household, router]);

  return <>{children}</>;
}
