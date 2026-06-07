"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Image from "next/image";
import logo from "@/public/logo.svg";
import AppSidebar from "./AppSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function HomePage() {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sidebarOpen = searchParams.get("menu") === "1";

  // `HouseholdGate` (in the layout) handles redirecting users without a
  // household — including ones who were just kicked, back to onboarding.
  const household = useQuery(api.households.getHousehold);

  return (
    <>
      <AppSidebar open={sidebarOpen} onClose={() => router.back()} />
      <div className="flex flex-col p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Image src={logo} alt="Tandem logo" className="w-8 h-8 shrink-0" />
            {household && (
              <span className="text-sm font-semibold truncate">{household.name}</span>
            )}
          </div>
          <button
            onClick={() => router.push(`${pathname}?menu=1`)}
            className="rounded-full ring-2 ring-border hover:ring-primary transition-all"
            aria-label="Open menu"
          >
            <Avatar>
              <AvatarImage src={user?.imageUrl} alt={user?.fullName ?? "Profile"} />
              <AvatarFallback>{user?.firstName?.[0] ?? "?"}</AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>
    </>
  );
}
