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

// Cryptographically random 6-character base-36 code.
function generateCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
  return Array.from(bytes, (b) => chars[b % 36]).join("");
}

// Generates a code that doesn't collide with any existing invite code.
async function generateUniqueCode(ctx: MutationCtx): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateCode();
    const existing = await ctx.db
      .query("invites")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique invite code — please try again");
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
      // Clean up ALL existing invites (not just the first) to avoid orphans,
      // then reuse a valid one or issue a fresh one.
      const existingInvites = await ctx.db
        .query("invites")
        .withIndex("by_household", (q) =>
          q.eq("householdId", existingMembership.householdId),
        )
        .collect();
      const validInvite = existingInvites.find(
        (inv) => inv.expiresAt > Date.now(),
      );
      if (validInvite) return validInvite.code;
      for (const inv of existingInvites) await ctx.db.delete(inv._id);

      const code = await generateUniqueCode(ctx);
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
      memberCount: 1,
    });
    await ctx.db.insert("householdMemberships", {
      householdId,
      tokenIdentifier: identity.tokenIdentifier,
    });

    const code = await generateUniqueCode(ctx);
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

    const code = await generateUniqueCode(ctx);
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

    // Read the household document and atomically increment memberCount.
    // Writing to this shared document causes Convex OCC to serialize concurrent
    // joins, preventing the member count from exceeding MAX_MEMBERS.
    const household = await ctx.db.get(invite.householdId);
    if (!household) throw new Error("Household no longer exists");
    if (household.memberCount >= MAX_MEMBERS)
      throw new Error(`This household is full (max ${MAX_MEMBERS} people)`);

    await ctx.db.patch(invite.householdId, {
      memberCount: household.memberCount + 1,
    });
    await ctx.db.insert("householdMemberships", {
      householdId: invite.householdId,
      tokenIdentifier: identity.tokenIdentifier,
    });
    // Invalidate the invite so it can't be reused.
    await ctx.db.delete(invite._id);

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
      memberCount: household.memberCount,
      isOwner: household.ownerTokenIdentifier === identity.tokenIdentifier,
      inviteCode: activeInvite?.code ?? null,
      inviteExpiresAt: activeInvite?.expiresAt ?? null,
      members: memberships.map((m) => ({
        membershipId: m._id,
        // Return only the Clerk user ID, not the full tokenIdentifier, to
        // avoid leaking the auth-provider-encoded identity to all members.
        clerkUserId: m.tokenIdentifier.split("|").pop() ?? m.tokenIdentifier,
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
    await ctx.db.patch(household._id, {
      memberCount: Math.max(1, household.memberCount - 1),
    });
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
      await ctx.db.patch(household._id, {
        memberCount: Math.max(1, household.memberCount - 1),
      });
    }

    return null;
  },
});
