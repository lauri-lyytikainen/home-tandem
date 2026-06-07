"use client";

import { UserProfile } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-svh">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </button>
        <span className="font-semibold text-base">Profile</span>
      </div>
      <div className="flex flex-1 p-0">
        <UserProfile
          routing="hash"
          appearance={{
            options: { elevation: "flush" },
            elements: {
              rootBox: "!w-full !h-full !max-w-none",
              cardBox: "!w-full !h-full !max-w-none",
              card: "!w-full !h-full !max-w-none !shadow-none !rounded-none",
              scrollBox: "!w-full",
              pageScrollBox: "!w-full",
            },
          }}
        />
      </div>
    </div>
  );
}
