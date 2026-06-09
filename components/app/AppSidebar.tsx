"use client";

import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { ArrowLeft, Settings, User, LogOut } from "lucide-react";

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function AppSidebar({ open, onClose }: AppSidebarProps) {
  const router = useRouter();
  const { signOut } = useClerk();
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex flex-col w-full sm:w-80 bg-background shadow-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Close menu"
          >
            <ArrowLeft className="size-5" />
          </button>
          <span className="font-semibold text-base">Menu</span>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          <button
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-muted transition-colors text-left"
            onClick={() => router.push("/app/profile")}
          >
            <User className="size-5 text-muted-foreground" />
            Profile
          </button>
          <button
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-muted transition-colors text-left"
            onClick={() => router.push("/app/household")}
          >
            <Settings className="size-5 text-muted-foreground" />
            Settings
          </button>
          <button
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-muted transition-colors text-left"
            onClick={() => signOut(() => router.push("/app"))}
          >
            <LogOut className="size-5 text-muted-foreground" />
            Sign out
          </button>
        </nav>
      </div>
    </>
  );
}
