import { QueryCtx } from "./_generated/server";

export async function requireHousehold(ctx: QueryCtx, tokenIdentifier: string) {
  const membership = await ctx.db
    .query("householdMemberships")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .first();
  if (!membership) throw new Error("You are not in a household");
  return membership.householdId;
}

export function toClerkUserId(tokenIdentifier: string) {
  return tokenIdentifier.split("|").pop() ?? tokenIdentifier;
}
