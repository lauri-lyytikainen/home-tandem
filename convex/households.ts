import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Creates a household for the current user and returns their invite code.
// Idempotent — calling it again returns the existing invite code.
export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existingMembership = await ctx.db
      .query("householdMemberships")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (existingMembership) {
      const existingInvite = await ctx.db
        .query("invites")
        .withIndex("by_creator", (q) =>
          q.eq("createdByTokenIdentifier", identity.tokenIdentifier)
        )
        .unique();
      return existingInvite?.code ?? null;
    }

    const householdId = await ctx.db.insert("households", {});
    await ctx.db.insert("householdMemberships", {
      householdId,
      tokenIdentifier: identity.tokenIdentifier,
    });

    const code = Math.random().toString(36).slice(2, 8);
    await ctx.db.insert("invites", {
      code,
      householdId,
      createdByTokenIdentifier: identity.tokenIdentifier,
    });

    return code;
  },
});

// Joins an existing household via invite code.
// Idempotent — if already a member, returns the existing householdId.
export const joinByCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("householdMemberships")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (existing) return existing.householdId;

    const invite = await ctx.db
      .query("invites")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
    if (!invite) throw new Error("Invalid invite code");

    await ctx.db.insert("householdMemberships", {
      householdId: invite.householdId,
      tokenIdentifier: identity.tokenIdentifier,
    });

    return invite.householdId;
  },
});

export const getMyHousehold = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const membership = await ctx.db
      .query("householdMemberships")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    return membership?.householdId ?? null;
  },
});
