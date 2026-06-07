import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";

const MAX_MEMBERS = 5;
const MAX_NAME_LENGTH = 60;
const INVITE_TTL_MS = 60 * 60 * 1000; // 1 hour

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

async function deleteHouseholdInvites(
  ctx: MutationCtx,
  householdId: import("./_generated/dataModel").Id<"households">,
) {
  const invites = await ctx.db
    .query("invites")
    .withIndex("by_household", (q) => q.eq("householdId", householdId))
    .collect();
  for (const invite of invites) {
    await ctx.db.delete(invite._id);
  }
}

// Creates a household for the current user and generates the first invite.
// Returns the invite code.
export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existingMembership = await requireMembership(
      ctx,
      identity.tokenIdentifier,
    );
    if (existingMembership) {
      const existingInvites = await ctx.db
        .query("invites")
        .withIndex("by_household", (q) =>
          q.eq("householdId", existingMembership.householdId),
        )
        .take(1);
      const existingInvite = existingInvites[0];
      if (existingInvite && existingInvite.expiresAt > Date.now())
        return existingInvite.code;
      // Expired or missing — generate a fresh one
      if (existingInvite) await ctx.db.delete(existingInvite._id);
      const code = Math.random().toString(36).slice(2, 8);
      await ctx.db.insert("invites", {
        code,
        householdId: existingMembership.householdId,
        createdByTokenIdentifier: identity.tokenIdentifier,
        expiresAt: Date.now() + INVITE_TTL_MS,
      });
      return code;
    }

    const householdId = await ctx.db.insert("households", {
      name: defaultHouseholdName(
        identity.name ?? identity.givenName ?? undefined,
      ),
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
      expiresAt: Date.now() + INVITE_TTL_MS,
    });

    return code;
  },
});

// Generates a new invite for the household (any member may call this).
// Replaces any existing invite. Returns the new code and expiry timestamp.
export const generateInvite = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const membership = await requireMembership(ctx, identity.tokenIdentifier);
    if (!membership) throw new Error("You are not in a household");

    await deleteHouseholdInvites(ctx, membership.householdId);

    const code = Math.random().toString(36).slice(2, 8);
    const expiresAt = Date.now() + INVITE_TTL_MS;
    await ctx.db.insert("invites", {
      code,
      householdId: membership.householdId,
      createdByTokenIdentifier: identity.tokenIdentifier,
      expiresAt,
    });

    return { code, expiresAt };
  },
});

// Joins an existing household via invite code.
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
    if (!invite) throw new Error("Invalid or expired invite code");
    if (invite.expiresAt < Date.now())
      throw new Error("This invite link has expired");

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

    const invites = await ctx.db
      .query("invites")
      .withIndex("by_household", (q) => q.eq("householdId", household._id))
      .take(1);
    const invite = invites[0] ?? null;
    const now = Date.now();
    const activeInvite = invite && invite.expiresAt > now ? invite : null;

    return {
      _id: household._id,
      name: household.name,
      isOwner: household.ownerTokenIdentifier === identity.tokenIdentifier,
      inviteCode: activeInvite?.code ?? null,
      inviteExpiresAt: activeInvite?.expiresAt ?? null,
      members: memberships.map((m) => ({
        membershipId: m._id,
        tokenIdentifier: m.tokenIdentifier,
        isOwner: m.tokenIdentifier === household.ownerTokenIdentifier,
        isMe: m.tokenIdentifier === identity.tokenIdentifier,
      })),
    };
  },
});

export const rename = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const name = args.name.trim();
    if (!name) throw new Error("Household name cannot be empty");
    if (name.length > MAX_NAME_LENGTH)
      throw new Error(
        `Household name must be ${MAX_NAME_LENGTH} characters or fewer`,
      );

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

// Removes a member from the household. Only the owner may do this.
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

// Leaves the household.
// Non-owners can always leave. The owner can only leave when they are the
// sole remaining member, which also deletes the household and all its invites.
export const leave = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const membership = await requireMembership(ctx, identity.tokenIdentifier);
    if (!membership) throw new Error("You are not in a household");

    const household = await ctx.db.get(membership.householdId);
    if (!household) throw new Error("Household not found");

    const isOwner = household.ownerTokenIdentifier === identity.tokenIdentifier;

    if (isOwner) {
      const allMembers = await ctx.db
        .query("householdMemberships")
        .withIndex("by_household", (q) => q.eq("householdId", household._id))
        .collect();
      if (allMembers.length > 1)
        throw new Error(
          "You must remove all other members before leaving as the owner",
        );

      await deleteHouseholdInvites(ctx, household._id);
      await ctx.db.delete(membership._id);
      await ctx.db.delete(household._id);
    } else {
      await ctx.db.delete(membership._id);
    }

    return null;
  },
});
