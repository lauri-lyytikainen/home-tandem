import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

async function requireHousehold(ctx: QueryCtx, tokenIdentifier: string) {
  const membership = await ctx.db
    .query("householdMemberships")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .first();
  if (!membership) throw new Error("You are not in a household");
  return membership.householdId;
}

function toClerkUserId(tokenIdentifier: string) {
  return tokenIdentifier.split("|").pop() ?? tokenIdentifier;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const householdId = await requireHousehold(ctx, identity.tokenIdentifier);

    const items = await ctx.db
      .query("shoppingItems")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .take(200);

    const ACTIVITY_WINDOW_MS = 5 * 60 * 1000;
    const pending = items.filter((i) => !i.completed);
    const newest = pending.reduce<(typeof pending)[0] | null>(
      (acc, i) => (!acc || i._creationTime > acc._creationTime ? i : acc),
      null,
    );
    const recentActivity =
      newest && Date.now() - newest._creationTime < ACTIVITY_WINDOW_MS
        ? {
            itemName: newest.name,
            addedByClerkUserId: toClerkUserId(newest.addedByTokenIdentifier),
            addedAt: newest._creationTime,
          }
        : null;

    return {
      items: items.map((item) => ({
        _id: item._id,
        name: item.name,
        category: item.category ?? null,
        quantity: item.quantity ?? null,
        completed: item.completed,
        addedByClerkUserId: toClerkUserId(item.addedByTokenIdentifier),
        _creationTime: item._creationTime,
      })),
      recentActivity,
      myClerkUserId: toClerkUserId(identity.tokenIdentifier),
    };
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    category: v.optional(v.string()),
    quantity: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const name = args.name.trim();
    if (!name) throw new Error("Item name cannot be empty");

    const householdId = await requireHousehold(ctx, identity.tokenIdentifier);

    await ctx.db.insert("shoppingItems", {
      householdId,
      name,
      category: args.category,
      quantity: args.quantity,
      completed: false,
      addedByTokenIdentifier: identity.tokenIdentifier,
    });
  },
});

export const toggle = mutation({
  args: { id: v.id("shoppingItems") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Item not found");

    await requireHousehold(ctx, identity.tokenIdentifier);

    await ctx.db.patch(args.id, { completed: !item.completed });
  },
});

export const remove = mutation({
  args: { id: v.id("shoppingItems") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Item not found");

    await requireHousehold(ctx, identity.tokenIdentifier);

    await ctx.db.delete(args.id);
  },
});

export const clearCompleted = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const householdId = await requireHousehold(ctx, identity.tokenIdentifier);

    const completed = await ctx.db
      .query("shoppingItems")
      .withIndex("by_household_and_completed", (q) =>
        q.eq("householdId", householdId).eq("completed", true),
      )
      .take(200);

    for (const item of completed) {
      await ctx.db.delete(item._id);
    }
  },
});
