"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Check, ListChecks, Users } from "lucide-react";
import { getMemberProfiles, MemberProfile } from "@/app/app/household/_actions";
import {
  CATEGORY_META,
  formatDueLabel,
  formatRecurrenceLabel,
  splitTasksByDue,
  TaskCategory,
  TaskRecurrence,
} from "./taskUtils";
import TaskDetailDrawer from "./TaskDetailDrawer";

export type Task = {
  _id: Id<"tasks">;
  name: string;
  category: TaskCategory;
  status: "todo" | "in_progress" | "done";
  note: string | null;
  dueDate: number | null;
  assigneeMembershipId: Id<"householdMemberships"> | null;
  assigneeClerkUserId: string | null;
  recurrence: TaskRecurrence | null;
  _creationTime: number;
};

export function TaskRow({
  task,
  profile,
  onOpen,
  onToggle,
}: {
  task: Task;
  profile: MemberProfile | undefined;
  onOpen: (id: Id<"tasks">) => void;
  onToggle: (id: Id<"tasks">) => void;
}) {
  const meta = CATEGORY_META[task.category];
  const Icon = meta.icon;
  const due = formatDueLabel(task.dueDate);
  const recurrenceLabel = formatRecurrenceLabel(task.recurrence);
  const done = task.status === "done";

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 bg-background rounded-2xl border border-border cursor-pointer active:bg-muted/50 transition-colors ${done ? "opacity-60" : ""}`}
      onClick={() => onOpen(task._id)}
    >
      <button
        type="button"
        aria-label={done ? "Mark as to-do" : "Mark as done"}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(task._id);
        }}
        className={`w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-colors ${
          done
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background hover:border-primary"
        }`}
      >
        {done && <Check className="w-3 h-3" />}
      </button>

      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{task.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {meta.label} · {due.label}
          {recurrenceLabel && <> · ↻ {recurrenceLabel}</>}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        {due.overdue && (
          <span className="w-1.5 h-1.5 rounded-full bg-destructive" aria-hidden />
        )}
        {task.assigneeClerkUserId ? (
          <Avatar className="w-7 h-7">
            {profile && <AvatarImage src={profile.imageUrl} alt={profile.name} />}
            <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
              {profile ? profile.name.slice(0, 2).toUpperCase() : "?"}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div
            className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground"
            aria-label="Shared"
          >
            <Users className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function TaskList() {
  const data = useQuery(api.tasks.list);
  const completeMutation = useMutation(api.tasks.complete);
  const uncompleteMutation = useMutation(api.tasks.uncomplete);

  const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);
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

  if (!data) return null;

  const overdueCount = data.tasks.filter((t) => formatDueLabel(t.dueDate).overdue).length;
  const selectedTask = data.tasks.find((t) => t._id === selectedTaskId) ?? null;
  const { today, upcoming } = splitTasksByDue(data.tasks);

  const renderRow = (task: Task) => (
    <TaskRow
      key={task._id}
      task={task}
      profile={task.assigneeClerkUserId ? profiles.get(task.assigneeClerkUserId) : undefined}
      onOpen={setSelectedTaskId}
      onToggle={(id) => {
          const t = data?.tasks.find((x) => x._id === id);
          if (t?.status === "done") uncompleteMutation({ id });
          else completeMutation({ id });
        }}
    />
  );

  return (
    <div className="mt-6 px-4 flex flex-col gap-6">
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Today
          </p>
          {overdueCount > 0 && (
            <Badge variant="destructive" className="rounded-full">
              {overdueCount} overdue
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {today.map(renderRow)}
          {data.tasks.length === 0 && (
            <Empty className="border-border mx-auto">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ListChecks />
                </EmptyMedia>
                <EmptyTitle>No tasks yet</EmptyTitle>
                <EmptyDescription>Tap + to add your first task.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </div>

      {upcoming.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-2">
            Upcoming
          </p>
          <div className="flex flex-col gap-3">
            {upcoming.map((group) => (
              <div key={group.dateKey}>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 px-1 mb-2">
                  {group.dayLabel}
                </p>
                <div className="flex flex-col gap-2">{group.tasks.map(renderRow)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

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
    </div>
  );
}
