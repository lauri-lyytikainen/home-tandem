import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

const MAX_MEMBERS = 5;
const MAX_NAME_LENGTH = 60;

// Looks up the caller's membership row. Uses `.take(1)` rather than
// `.unique()` so a stray duplicate row (e.g. left over from rejoining via an
// old invite link, or any other edge case) can never make this — and every
// query built on top of it — throw. A thrown query never resolves to `null`,
// which would silently break the "redirect to onboarding" logic that depends
// on a definite answer.
async function requireMembership(ctx: QueryCtx, tokenIdentifier: string) {
  const memberships = await ctx.db
    .query("householdMemberships")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .take(1);
  return memberships[0] ?? null;
}

function defaultHouseholdName(name: string | undefined) {
  const trimmed = name?.trim();
  return trimmed ? `${trimmed}'s household` : "Our household";
}

// Creates a household for the current user and returns their invite code.
// Idempotent — calling it again returns the existing invite code.
export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existingMembership = await requireMembership(
      ctx,
      identity.tokenIdentifier
    );

    if (existingMembership) {
      const existingInvite = await ctx.db
        .query("invites")
        .withIndex("by_creator", (q) =>
          q.eq("createdByTokenIdentifier", identity.tokenIdentifier)
        )
        .unique();
      return existingInvite?.code ?? null;
    }

    const householdId = await ctx.db.insert("households", {
      name: defaultHouseholdName(identity.name ?? identity.givenName ?? undefined),
      ownerTokenIdentifier: identity.tokenIdentifier,
    });
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

    const existing = await requireMembership(ctx, identity.tokenIdentifier);
    if (existing) return existing.householdId;

    const code = args.code.trim().toLowerCase();
    if (!code) throw new Error("Invalid invite code");

    const invite = await ctx.db
      .query("invites")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (!invite) throw new Error("Invalid invite code");

    const members = await ctx.db
      .query("householdMemberships")
      .withIndex("by_household", (q) => q.eq("householdId", invite.householdId))
      .collect();
    if (members.length >= MAX_MEMBERS)
      throw new Error(`This household is full (max ${MAX_MEMBERS} people)`);

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

    const membership = await requireMembership(ctx, identity.tokenIdentifier);
    return membership?.householdId ?? null;
  },
});

// Returns the current user's household with its name, the invite code, and
// the membership roster (token identifiers only — profile info such as name
// and avatar must be resolved client-side from the auth provider).
export const getHousehold = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const membership = await requireMembership(ctx, identity.tokenIdentifier);
    if (!membership) return null;

    const household = await ctx.db.get(membership.householdId);
    if (!household) return null;

    const memberships = await ctx.db
      .query("householdMemberships")
      .withIndex("by_household", (q) => q.eq("householdId", household._id))
      .collect();

    const invite = await ctx.db
      .query("invites")
      .withIndex("by_creator", (q) =>
        q.eq("createdByTokenIdentifier", household.ownerTokenIdentifier)
      )
      .unique();

    return {
      _id: household._id,
      name: household.name,
      isOwner: household.ownerTokenIdentifier === identity.tokenIdentifier,
      inviteCode: invite?.code ?? null,
      members: memberships.map((m) => ({
        membershipId: m._id,
        tokenIdentifier: m.tokenIdentifier,
        isOwner: m.tokenIdentifier === household.ownerTokenIdentifier,
        isMe: m.tokenIdentifier === identity.tokenIdentifier,
      })),
    };
  },
});

// Renames the household. Only the owner may do this.
export const rename = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const name = args.name.trim();
    if (!name) throw new Error("Household name cannot be empty");
    if (name.length > MAX_NAME_LENGTH)
      throw new Error(`Household name must be ${MAX_NAME_LENGTH} characters or fewer`);

    const membership = await requireMembership(ctx, identity.tokenIdentifier);
    if (!membership) throw new Error("You are not in a household");

    const household = await ctx.db.get(membership.householdId);
    if (!household) throw new Error("Household not found");
    if (household.ownerTokenIdentifier !== identity.tokenIdentifier)
      throw new Error("Only the household owner can rename the household");

    await ctx.db.patch(household._id, { name });
    return null;
  },
});

// Removes a member from the household. Only the owner may do this, and the
// owner cannot remove themselves (they would have to delete the household).
export const removeMember = mutation({
  args: { membershipId: v.id("householdMemberships") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const membership = await requireMembership(ctx, identity.tokenIdentifier);
    if (!membership) throw new Error("You are not in a household");

    const household = await ctx.db.get(membership.householdId);
    if (!household) throw new Error("Household not found");
    if (household.ownerTokenIdentifier !== identity.tokenIdentifier)
      throw new Error("Only the household owner can remove members");

    const target = await ctx.db.get(args.membershipId);
    if (!target || target.householdId !== household._id)
      throw new Error("Member not found");
    if (target.tokenIdentifier === household.ownerTokenIdentifier)
      throw new Error("The household owner cannot be removed");

    await ctx.db.delete(target._id);
    return null;
  },
});
