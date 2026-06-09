"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ListChecks, Plus, RefreshCw, Users } from "lucide-react";
import { getMemberProfiles, MemberProfile } from "@/app/app/household/_actions";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import TaskFormDrawer from "./TaskFormDrawer";
import TaskDetailDrawer from "./TaskDetailDrawer";
import { TaskRow, type Task } from "./TaskList";

type StatusFilter = "todo" | "in_progress" | "done";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

type MemberFilter = "everyone" | "shared" | (string & {});

export default function BoardPage() {
  const data = useQuery(api.tasks.listAll);
  const household = useQuery(api.households.getHousehold);
  const completeMutation = useMutation(api.tasks.complete);
  const uncompleteMutation = useMutation(api.tasks.uncomplete);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todo");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("everyone");
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [profiles, setProfiles] = useState<Map<string, MemberProfile>>(new Map());

  useEffect(() => {
    if (!data?.tasks) return;
    const uniqueIds = [
      ...new Set(
        data.tasks
          .map((t) => t.assigneeClerkUserId)
          .filter((id): id is string => id !== null),
      ),
    ];
    if (uniqueIds.length === 0) return;
    getMemberProfiles(uniqueIds).then((result) => {
      if ("profiles" in result && result.profiles) {
        setProfiles(new Map(result.profiles.map((p) => [p.id, p])));
      }
    });
  }, [data?.tasks]);

  if (!data || !household) return null;

  const counts = {
    todo: data.tasks.filter((t) => t.status === "todo").length,
    in_progress: data.tasks.filter((t) => t.status === "in_progress").length,
    done: data.tasks.filter((t) => t.status === "done").length,
  };

  let tasks = data.tasks.filter((t) => t.status === statusFilter);
  if (recurringOnly) tasks = tasks.filter((t) => t.recurrence !== null);

  if (memberFilter === "shared") {
    tasks = tasks.filter((t) => t.assigneeMembershipId === null);
  } else if (memberFilter !== "everyone") {
    tasks = tasks.filter((t) => t.assigneeMembershipId === memberFilter);
  }

  const showSharedBanner =
    (memberFilter === "everyone" || memberFilter === "shared") &&
    tasks.some((t) => t.assigneeMembershipId === null);

  const selectedTask = data.tasks.find((t) => t._id === selectedTaskId) ?? null;

  const memberFilters: { value: MemberFilter; label: string }[] = [
    { value: "everyone", label: "Everyone" },
    ...household.members.map((m) => ({
      value: m.membershipId as string,
      label: m.isMe ? "You" : (profiles.get(m.clerkUserId)?.name.split(" ")[0] ?? "Member"),
    })),
    { value: "shared", label: "Shared" },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-start justify-between px-4 pt-6 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
            All tasks
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">Board</h1>
        </div>
        <button
          onClick={() => setRecurringOnly((v) => !v)}
          className={`flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors mt-2 ${
            recurringOnly
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:border-foreground"
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Recurring
        </button>
      </div>

      <div className="px-4 mb-3">
        <div className="flex bg-muted rounded-2xl p-1 gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`flex-1 text-sm font-medium rounded-xl py-2 transition-colors ${
                statusFilter === tab.value
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {counts[tab.value]} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mb-3 flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none">
        {memberFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setMemberFilter(f.value)}
            className={`shrink-0 text-sm font-medium rounded-full px-4 py-1.5 border transition-colors ${
              memberFilter === f.value
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:border-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 flex flex-col gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none">
        {showSharedBanner && (
          <div className="flex items-start gap-2.5 bg-muted/60 rounded-2xl px-4 py-3 mb-1">
            <Users className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Shared backlog — either of you can pick these up
            </p>
          </div>
        )}

        {tasks.length === 0 ? (
          <Empty className="border-border mx-auto">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListChecks />
              </EmptyMedia>
              <EmptyTitle>No tasks here</EmptyTitle>
              <EmptyDescription>
                Nothing matches this filter right now.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          tasks.map((task) => (
            <TaskRow
              key={task._id}
              task={task as Task}
              profile={task.assigneeClerkUserId ? profiles.get(task.assigneeClerkUserId) : undefined}
              onOpen={setSelectedTaskId}
              onToggle={(id) => {
                const t = data.tasks.find((x) => x._id === id);
                if (t?.status === "done") uncompleteMutation({ id });
                else completeMutation({ id });
              }}
            />
          ))
        )}
      </div>

      <button
        onClick={() => setTaskFormOpen(true)}
        aria-label="Add task"
        className="fixed bottom-24 right-4 z-30 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-5 h-5" />
      </button>

      <TaskDetailDrawer
        task={selectedTask}
        assigneeProfile={
          selectedTask?.assigneeClerkUserId
            ? profiles.get(selectedTask.assigneeClerkUserId)
            : undefined
        }
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
      />
      <TaskFormDrawer open={taskFormOpen} onOpenChange={setTaskFormOpen} />
    </div>
  );
}
