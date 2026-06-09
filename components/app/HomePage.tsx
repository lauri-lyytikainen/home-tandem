"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus } from "lucide-react";
import AppSidebar from "./AppSidebar";
import TaskList from "./TaskList";
import TaskFormDrawer from "./TaskFormDrawer";

export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sidebarOpen = searchParams.get("menu") === "1";
  const [taskFormOpen, setTaskFormOpen] = useState(false);

  // `HouseholdGate` (in the layout) handles redirecting users without a
  // household — including ones who were just kicked, back to onboarding.
  const household = useQuery(api.households.getHousehold);

  return (
    <>
      <AppSidebar open={sidebarOpen} onClose={() => router.back()} />
      <div className="flex flex-col grow min-h-0 overflow-y-auto">
        <div className="px-4 pt-6 pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
            {household?.name ?? "Your household"}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">Tasks</h1>
        </div>

        <TaskList />
      </div>

      <button
        onClick={() => setTaskFormOpen(true)}
        aria-label="Add task"
        className="fixed bottom-24 right-4 z-30 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-5 h-5" />
      </button>
      <TaskFormDrawer open={taskFormOpen} onOpenChange={setTaskFormOpen} />
    </>
  );
}
