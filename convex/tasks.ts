import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireHousehold, toClerkUserId } from "./lib";

const categoryValidator = v.union(
  v.literal("maintenance"),
  v.literal("cleaning"),
  v.literal("admin"),
  v.literal("groceries"),
  v.literal("other"),
);

const recurrenceValidator = v.object({
  frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
  interval: v.number(),
  rotateAssignee: v.boolean(),
});

// Assignees are stored as household membership ids (rather than token
// identifiers) so the client never needs to know other members' raw auth
// identities — it only ever sees the membership id and Clerk user id that
// `households.getHousehold` already exposes.
async function resolveAssignee(
  ctx: QueryCtx,
  householdId: Id<"households">,
  membershipId: Id<"householdMemberships"> | undefined,
) {
  if (!membershipId) return undefined;
  const membership = await ctx.db.get(membershipId);
  if (!membership || membership.householdId !== householdId) {
    throw new Error("Invalid assignee");
  }
  return membershipId;
}

async function listTasksByStatuses(
  ctx: QueryCtx,
  statuses: ("todo" | "in_progress" | "done")[],
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const membership = await ctx.db
    .query("householdMemberships")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .first();
  if (!membership) return null;
  const householdId = membership.householdId;

  const groups = await Promise.all(
    statuses.map((status) =>
      ctx.db
        .query("tasks")
        .withIndex("by_household_and_status", (q) =>
          q.eq("householdId", householdId).eq("status", status),
        )
        .take(200),
    ),
  );

  const tasks = groups.flat().sort((a, b) => {
    if (a.dueDate === undefined) return 1;
    if (b.dueDate === undefined) return -1;
    return a.dueDate - b.dueDate;
  });

  const membershipIds = [
    ...new Set(
      tasks
        .map((t) => t.assigneeMembershipId)
        .filter((id): id is Id<"householdMemberships"> => id !== undefined),
    ),
  ];
  const memberships = await Promise.all(membershipIds.map((id) => ctx.db.get(id)));
  const membershipToClerkId = new Map(
    memberships
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .map((m) => [m._id, toClerkUserId(m.tokenIdentifier)]),
  );

  return {
    tasks: tasks.map((task) => ({
      _id: task._id,
      name: task.name,
      category: task.category,
      status: task.status,
      note: task.note ?? null,
      dueDate: task.dueDate ?? null,
      assigneeMembershipId: task.assigneeMembershipId ?? null,
      assigneeClerkUserId: task.assigneeMembershipId
        ? (membershipToClerkId.get(task.assigneeMembershipId) ?? null)
        : null,
      recurrence: task.recurrence ?? null,
      _creationTime: task._creationTime,
    })),
    myClerkUserId: toClerkUserId(identity.tokenIdentifier),
  };
}

export const list = query({
  args: {},
  handler: (ctx) => listTasksByStatuses(ctx, ["todo", "in_progress"]),
});

export const listAll = query({
  args: {},
  handler: (ctx) => listTasksByStatuses(ctx, ["todo", "in_progress", "done"]),
});

export const create = mutation({
  args: {
    name: v.string(),
    category: categoryValidator,
    dueDate: v.optional(v.number()),
    note: v.optional(v.string()),
    assigneeMembershipId: v.optional(v.id("householdMemberships")),
    recurrence: v.optional(recurrenceValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const name = args.name.trim();
    if (!name) throw new Error("Task name cannot be empty");

    const householdId = await requireHousehold(ctx, identity.tokenIdentifier);
    const assigneeMembershipId = await resolveAssignee(ctx, householdId, args.assigneeMembershipId);

    await ctx.db.insert("tasks", {
      householdId,
      name,
      category: args.category,
      status: "todo",
      note: args.note,
      dueDate: args.dueDate,
      assigneeMembershipId,
      recurrence: args.recurrence,
      createdByTokenIdentifier: identity.tokenIdentifier,
    });
  },
});

export const complete = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const householdId = await requireHousehold(ctx, identity.tokenIdentifier);
    const task = await ctx.db.get(args.id);
    if (!task || task.householdId !== householdId) throw new Error("Task not found");

    await ctx.db.patch(args.id, {
      status: "done",
      completedAt: Date.now(),
    });
  },
});

export const reschedule = mutation({
  args: { id: v.id("tasks"), dueDate: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const householdId = await requireHousehold(ctx, identity.tokenIdentifier);
    const task = await ctx.db.get(args.id);
    if (!task || task.householdId !== householdId) throw new Error("Task not found");

    await ctx.db.patch(args.id, { dueDate: args.dueDate });
  },
});

export const reassign = mutation({
  args: { id: v.id("tasks"), assigneeMembershipId: v.optional(v.id("householdMemberships")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const householdId = await requireHousehold(ctx, identity.tokenIdentifier);
    const task = await ctx.db.get(args.id);
    if (!task || task.householdId !== householdId) throw new Error("Task not found");

    const assigneeMembershipId = await resolveAssignee(ctx, householdId, args.assigneeMembershipId);

    await ctx.db.patch(args.id, { assigneeMembershipId });
  },
});

export const uncomplete = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const householdId = await requireHousehold(ctx, identity.tokenIdentifier);
    const task = await ctx.db.get(args.id);
    if (!task || task.householdId !== householdId) throw new Error("Task not found");

    await ctx.db.patch(args.id, { status: "todo", completedAt: undefined });
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    name: v.string(),
    category: categoryValidator,
    dueDate: v.optional(v.number()),
    note: v.optional(v.string()),
    assigneeMembershipId: v.optional(v.id("householdMemberships")),
    recurrence: v.optional(recurrenceValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const name = args.name.trim();
    if (!name) throw new Error("Task name cannot be empty");

    const householdId = await requireHousehold(ctx, identity.tokenIdentifier);
    const task = await ctx.db.get(args.id);
    if (!task || task.householdId !== householdId) throw new Error("Task not found");

    const assigneeMembershipId = await resolveAssignee(ctx, householdId, args.assigneeMembershipId);

    await ctx.db.patch(args.id, {
      name,
      category: args.category,
      dueDate: args.dueDate,
      note: args.note,
      assigneeMembershipId,
      recurrence: args.recurrence,
    });
  },
});

export const fairnessStats = query({
  args: {
    period: v.union(v.literal("week"), v.literal("month"), v.literal("all")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const membership = await ctx.db
      .query("householdMemberships")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();
    if (!membership) return null;
    const householdId = membership.householdId;

    const doneTasks = await ctx.db
      .query("tasks")
      .withIndex("by_household_and_status", (q) =>
        q.eq("householdId", householdId).eq("status", "done"),
      )
      .collect();

    let since: number | null = null;
    if (args.period === "week") {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      since = d.getTime();
    } else if (args.period === "month") {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      since = d.getTime();
    }

    const filtered = since !== null
      ? doneTasks.filter((t) => t.completedAt !== undefined && t.completedAt >= since!)
      : doneTasks;

    const memberships = await ctx.db
      .query("householdMemberships")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .collect();

    const n = memberships.length;
    const sharedTasks = filtered.filter((t) => !t.assigneeMembershipId);

    return memberships.map((m) => {
      const assignedTasks = filtered.filter((t) => t.assigneeMembershipId === m._id);
      const byCategory: Record<string, number> = {};
      for (const t of assignedTasks) {
        byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
      }
      // Distribute shared tasks equally across all members
      for (const t of sharedTasks) {
        byCategory[t.category] = (byCategory[t.category] ?? 0) + 1 / n;
      }
      return {
        membershipId: m._id,
        clerkUserId: toClerkUserId(m.tokenIdentifier),
        isMe: m.tokenIdentifier === identity.tokenIdentifier,
        total: assignedTasks.length + sharedTasks.length / n,
        byCategory,
      };
    });
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const householdId = await requireHousehold(ctx, identity.tokenIdentifier);
    const task = await ctx.db.get(args.id);
    if (!task || task.householdId !== householdId) throw new Error("Task not found");

    await ctx.db.delete(args.id);
  },
});
