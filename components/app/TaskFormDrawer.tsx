"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { getMemberProfiles, MemberProfile } from "@/app/app/household/_actions";
import {
  CATEGORY_META,
  CATEGORY_OPTIONS,
  TaskCategory,
  TaskRecurrence,
} from "./taskUtils";
import { CalendarClock, ChevronDown, Repeat, Users } from "lucide-react";
import type { Task } from "./TaskList";

const FREQUENCY_OPTIONS: { value: TaskRecurrence["frequency"] | "none"; label: string }[] = [
  { value: "none", label: "Doesn't repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

type Assignee = { membershipId: Id<"householdMemberships">; clerkUserId: string } | "shared" | null;

function taskToAssignee(task: Task): Assignee {
  if (!task.assigneeMembershipId || !task.assigneeClerkUserId) return "shared";
  return { membershipId: task.assigneeMembershipId, clerkUserId: task.assigneeClerkUserId };
}

export default function TaskFormDrawer({
  open,
  onOpenChange,
  initialTask,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTask?: Task;
}) {
  const isEditing = !!initialTask;
  const household = useQuery(api.households.getHousehold);
  const createMutation = useMutation(api.tasks.create);
  const updateMutation = useMutation(api.tasks.update);

  const [profiles, setProfiles] = useState<Map<string, MemberProfile>>(new Map());
  const [name, setName] = useState(initialTask?.name ?? "");
  const [category, setCategory] = useState<TaskCategory>(initialTask?.category ?? "other");
  const [dueDate, setDueDate] = useState<Date | undefined>(
    initialTask?.dueDate ? new Date(initialTask.dueDate) : undefined,
  );
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [assignee, setAssignee] = useState<Assignee>(
    initialTask ? taskToAssignee(initialTask) : "shared",
  );
  const [note, setNote] = useState(initialTask?.note ?? "");
  const [frequency, setFrequency] = useState<TaskRecurrence["frequency"] | "none">(
    initialTask?.recurrence?.frequency ?? "none",
  );
  const [rotateAssignee, setRotateAssignee] = useState(
    initialTask?.recurrence?.rotateAssignee ?? false,
  );
  const [submitting, setSubmitting] = useState(false);

  // Re-seed state when the dialog opens for a (possibly different) task
  useEffect(() => {
    if (!open) return;
    setName(initialTask?.name ?? "");
    setCategory(initialTask?.category ?? "other");
    setDueDate(initialTask?.dueDate ? new Date(initialTask.dueDate) : undefined);
    setAssignee(initialTask ? taskToAssignee(initialTask) : "shared");
    setNote(initialTask?.note ?? "");
    setFrequency(initialTask?.recurrence?.frequency ?? "none");
    setRotateAssignee(initialTask?.recurrence?.rotateAssignee ?? false);
  }, [open, initialTask]);

  useEffect(() => {
    if (!household?.members) return;
    const ids = household.members.map((m) => m.clerkUserId);
    if (ids.length === 0) return;
    getMemberProfiles(ids).then((result) => {
      if ("profiles" in result && result.profiles) {
        setProfiles(new Map(result.profiles.map((p) => [p.id, p])));
      }
    });
  }, [household?.members]);

  function reset() {
    setName("");
    setCategory("other");
    setDueDate(undefined);
    setAssignee("shared");
    setNote("");
    setFrequency("none");
    setRotateAssignee(false);
  }

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed || submitting) return;

    const assigneeMembershipId =
      assignee && assignee !== "shared" ? assignee.membershipId : undefined;
    const recurrence =
      frequency === "none" ? undefined : { frequency, interval: 1, rotateAssignee };

    setSubmitting(true);
    try {
      if (isEditing) {
        await updateMutation({
          id: initialTask._id,
          name: trimmed,
          category,
          dueDate: dueDate?.getTime(),
          note: note.trim() || undefined,
          assigneeMembershipId,
          recurrence,
        });
      } else {
        await createMutation({
          name: trimmed,
          category,
          dueDate: dueDate?.getTime(),
          note: note.trim() || undefined,
          assigneeMembershipId,
          recurrence,
        });
      }
      if (!isEditing) reset();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  const CategoryIcon = CATEGORY_META[category].icon;
  const assigneeProfile =
    assignee && assignee !== "shared" ? profiles.get(assignee.clerkUserId) : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isEditing) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details for this task."
              : "Add something for the household to take care of."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-name">Name</Label>
            <Input
              id="task-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Change boiler filter"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-between gap-2 h-9 w-full rounded-3xl border border-border bg-input/50 px-3 text-sm">
                  <span className="flex items-center gap-2">
                    <CategoryIcon className="w-4 h-4 text-muted-foreground" />
                    {CATEGORY_META[category].label}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width)">
                {CATEGORY_OPTIONS.map((option) => {
                  const Icon = CATEGORY_META[option].icon;
                  return (
                    <DropdownMenuItem key={option} onClick={() => setCategory(option)}>
                      <Icon className="w-4 h-4" /> {CATEGORY_META[option].label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Due date</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center justify-between gap-2 h-9 w-full rounded-3xl border border-border bg-input/50 px-3 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <CalendarClock className="w-4 h-4" />
                    {dueDate ? dueDate.toLocaleDateString() : "No due date"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(date) => {
                    setDueDate(date);
                    setDatePickerOpen(false);
                  }}
                />
                {dueDate && (
                  <div className="border-t border-border p-2">
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground w-full text-center py-1"
                      onClick={() => {
                        setDueDate(undefined);
                        setDatePickerOpen(false);
                      }}
                    >
                      Clear due date
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Assigned to</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-between gap-2 h-9 w-full rounded-3xl border border-border bg-input/50 px-3 text-sm">
                  <span className="flex items-center gap-2">
                    {assignee === "shared" || !assignee ? (
                      <>
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                          <Users className="w-3 h-3" />
                        </div>
                        Shared
                      </>
                    ) : (
                      <>
                        <Avatar className="w-5 h-5">
                          {assigneeProfile && (
                            <AvatarImage src={assigneeProfile.imageUrl} alt={assigneeProfile.name} />
                          )}
                          <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">
                            {assigneeProfile ? assigneeProfile.name.slice(0, 2).toUpperCase() : "?"}
                          </AvatarFallback>
                        </Avatar>
                        {assigneeProfile?.name ?? "Household member"}
                      </>
                    )}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width)">
                <DropdownMenuItem onClick={() => setAssignee("shared")}>
                  <Users /> Shared
                </DropdownMenuItem>
                {household?.members.map((member) => {
                  const profile = profiles.get(member.clerkUserId);
                  return (
                    <DropdownMenuItem
                      key={member.membershipId}
                      onClick={() =>
                        setAssignee({
                          membershipId: member.membershipId,
                          clerkUserId: member.clerkUserId,
                        })
                      }
                    >
                      <Avatar className="w-5 h-5">
                        {profile && <AvatarImage src={profile.imageUrl} alt={profile.name} />}
                        <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">
                          {profile ? profile.name.slice(0, 2).toUpperCase() : "?"}
                        </AvatarFallback>
                      </Avatar>
                      {profile?.name ?? "Household member"}
                      {member.isMe && " (you)"}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Repeats</Label>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-between gap-2 h-9 flex-1 rounded-3xl border border-border bg-input/50 px-3 text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Repeat className="w-4 h-4" />
                      {FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label}
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width)">
                  {FREQUENCY_OPTIONS.map((option) => (
                    <DropdownMenuItem key={option.value} onClick={() => setFrequency(option.value)}>
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {frequency !== "none" && (
                <button
                  type="button"
                  onClick={() => setRotateAssignee((v) => !v)}
                  className={`shrink-0 px-3 h-9 rounded-3xl border text-sm transition-colors ${
                    rotateAssignee
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-input/50 text-muted-foreground"
                  }`}
                >
                  Rotate
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-note">Note</Label>
            <textarea
              id="task-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for whoever picks this up…"
              rows={3}
              className="w-full rounded-2xl border border-transparent bg-input/50 px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 resize-none"
            />
          </div>

          <Button onClick={handleSubmit} disabled={!name.trim() || submitting} className="mt-1">
            {isEditing ? "Save changes" : "Add task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
