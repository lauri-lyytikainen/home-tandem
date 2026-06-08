import { differenceInCalendarDays, format, isToday, isYesterday, startOfDay } from "date-fns";
import { FileText, ListChecks, Sparkles, ShoppingCart, Wrench, type LucideIcon } from "lucide-react";

export type TaskCategory = "maintenance" | "cleaning" | "admin" | "groceries" | "other";

export type TaskRecurrence = {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  rotateAssignee: boolean;
};

export const CATEGORY_META: Record<TaskCategory, { label: string; icon: LucideIcon }> = {
  maintenance: { label: "Maintenance", icon: Wrench },
  cleaning: { label: "Cleaning", icon: Sparkles },
  admin: { label: "Admin", icon: FileText },
  groceries: { label: "Groceries", icon: ShoppingCart },
  other: { label: "Other", icon: ListChecks },
};

export const CATEGORY_OPTIONS: TaskCategory[] = [
  "maintenance",
  "cleaning",
  "admin",
  "groceries",
  "other",
];

export function formatDueLabel(dueDate: number | null): { label: string; overdue: boolean } {
  if (dueDate === null) return { label: "No due date", overdue: false };

  if (isToday(dueDate)) return { label: "Today", overdue: false };
  if (isYesterday(dueDate)) return { label: "Yesterday", overdue: true };

  const daysAgo = differenceInCalendarDays(Date.now(), dueDate);
  if (daysAgo > 0) return { label: `${daysAgo} days ago`, overdue: true };

  const daysAhead = -daysAgo;
  if (daysAhead <= 6) return { label: format(dueDate, "EEE"), overdue: false };
  return { label: format(dueDate, "MMM d"), overdue: false };
}

const FREQUENCY_LABEL: Record<TaskRecurrence["frequency"], { singular: string; plural: string }> = {
  daily: { singular: "Daily", plural: "days" },
  weekly: { singular: "Weekly", plural: "weeks" },
  monthly: { singular: "Monthly", plural: "months" },
};

export function formatRecurrenceLabel(recurrence: TaskRecurrence | null): string | null {
  if (!recurrence) return null;
  const { singular, plural } = FREQUENCY_LABEL[recurrence.frequency];
  const base = recurrence.interval > 1 ? `Every ${recurrence.interval} ${plural}` : singular;
  return recurrence.rotateAssignee ? `${base} · rotate` : base;
}

export type TaskWithDue = { dueDate: number | null };

export type UpcomingGroup<T> = { dateKey: string; dayLabel: string; tasks: T[] };

// Splits tasks into "today" (due today, overdue, or with no due date — i.e.
// needs attention now) and "upcoming" (future-dated, grouped by calendar day
// in chronological order) for the Home view's Today/Upcoming sections.
export function splitTasksByDue<T extends TaskWithDue>(tasks: T[]): {
  today: T[];
  upcoming: UpcomingGroup<T>[];
} {
  const today: T[] = [];
  const upcomingGroups = new Map<string, UpcomingGroup<T>>();

  for (const task of tasks) {
    const isFuture = task.dueDate !== null && differenceInCalendarDays(task.dueDate, Date.now()) > 0;
    if (!isFuture) {
      today.push(task);
      continue;
    }
    const dueDate = task.dueDate as number;
    const dateKey = format(dueDate, "yyyy-MM-dd");
    let group = upcomingGroups.get(dateKey);
    if (!group) {
      group = { dateKey, dayLabel: format(dueDate, "EEEE"), tasks: [] };
      upcomingGroups.set(dateKey, group);
    }
    group.tasks.push(task);
  }

  const upcoming = [...upcomingGroups.values()].sort(
    (a, b) => startOfDay(new Date(a.dateKey)).getTime() - startOfDay(new Date(b.dateKey)).getTime(),
  );

  return { today, upcoming };
}
