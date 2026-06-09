"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getMemberProfiles, MemberProfile } from "@/app/app/household/_actions";
import { CATEGORY_META, formatDueLabel } from "./taskUtils";
import { Check, CalendarClock, Pencil, Trash2, Users } from "lucide-react";
import type { Task } from "./TaskList";
import TaskFormDrawer from "./TaskFormDrawer";

export default function TaskDetailDrawer({
  task,
  assigneeProfile,
  onOpenChange,
}: {
  task: Task | null;
  assigneeProfile: MemberProfile | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  const household = useQuery(api.households.getHousehold);
  const completeMutation = useMutation(api.tasks.complete);
  const uncompleteMutation = useMutation(api.tasks.uncomplete);
  const rescheduleMutation = useMutation(api.tasks.reschedule);
  const reassignMutation = useMutation(api.tasks.reassign);
  const removeMutation = useMutation(api.tasks.remove);

  const [profiles, setProfiles] = useState<Map<string, MemberProfile>>(new Map());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

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

  if (!task) return null;

  const meta = CATEGORY_META[task.category];
  const Icon = meta.icon;
  const due = formatDueLabel(task.dueDate);

  return (
    <>
    <Dialog open={!!task} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 text-left">
              <DialogTitle className="truncate">{task.name}</DialogTitle>
              <DialogDescription>
                {meta.label} · {due.label}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col divide-y divide-border border-y border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-between gap-2 py-3 text-left hover:bg-muted/50 transition-colors rounded-lg -mx-1 px-1">
                <span className="text-sm text-muted-foreground shrink-0">Assigned to</span>
                <span className="flex items-center gap-2 min-w-0">
                  {assigneeProfile ? (
                    <>
                      <Avatar className="w-6 h-6 shrink-0">
                        <AvatarImage src={assigneeProfile.imageUrl} alt={assigneeProfile.name} />
                        <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                          {assigneeProfile.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">{assigneeProfile.name}</span>
                    </>
                  ) : (
                    <>
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                        <Users className="w-3 h-3" />
                      </div>
                      <span className="text-sm font-medium">Shared</span>
                    </>
                  )}
                  <span className="text-xs text-primary shrink-0">tap to reassign</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => reassignMutation({ id: task._id, assigneeMembershipId: undefined })}
              >
                <Users /> Shared
              </DropdownMenuItem>
              {household?.members.map((member) => {
                const profile = profiles.get(member.clerkUserId);
                return (
                  <DropdownMenuItem
                    key={member.membershipId}
                    onClick={() =>
                      reassignMutation({ id: task._id, assigneeMembershipId: member.membershipId })
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

          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center justify-between py-3 text-left hover:bg-muted/50 transition-colors rounded-lg -mx-1 px-1">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="w-4 h-4" />
                  Due
                </span>
                <span className={`text-sm font-medium ${due.overdue ? "text-destructive" : ""}`}>
                  {due.label}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={task.dueDate ? new Date(task.dueDate) : undefined}
                onSelect={(date) => {
                  if (!date) return;
                  rescheduleMutation({ id: task._id, dueDate: date.getTime() });
                  setDatePickerOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {task.note && (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-700">
              Note
            </p>
            <p className="text-sm text-amber-900 mt-0.5">{task.note}</p>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant={task.status === "done" ? "outline" : "default"}
              onClick={() =>
                task.status === "done"
                  ? uncompleteMutation({ id: task._id })
                  : completeMutation({ id: task._id })
              }
            >
              <Check /> {task.status === "done" ? "Mark to-do" : "Complete"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setDatePickerOpen(true)}>
              <CalendarClock /> Reschedule
            </Button>
          </div>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil /> Edit task
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors py-2">
                <Trash2 className="w-4 h-4" /> Delete task
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                <AlertDialogDescription>
                  &quot;{task.name}&quot; will be removed for everyone in the household. This
                  can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    removeMutation({ id: task._id });
                    onOpenChange(false);
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>

    <TaskFormDrawer
      open={editOpen}
      onOpenChange={setEditOpen}
      initialTask={task}
    />
    </>
  );
}
