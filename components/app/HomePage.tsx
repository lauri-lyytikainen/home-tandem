"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

  return (
    <>
      <AppSidebar open={sidebarOpen} onClose={() => router.back()} />
      <div className="flex flex-col p-4">
        <div className="flex items-center justify-between">
          <Image src={logo} alt="Tandem logo" className="w-8 h-8" />
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
