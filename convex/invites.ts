import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function generateCode(): string {
  return Math.random().toString(36).slice(2, 8);
}

export const getOrCreate = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("invites")
      .withIndex("by_creator", (q) =>
        q.eq("createdByTokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (existing) return existing.code;

    const code = generateCode();
    await ctx.db.insert("invites", {
      code,
      createdByTokenIdentifier: identity.tokenIdentifier,
    });
    return code;
  },
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invites")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
  },
});
