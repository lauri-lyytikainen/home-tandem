import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  households: defineTable({
    name: v.string(),
    ownerTokenIdentifier: v.string(),
    memberCount: v.number(),
  }),

  householdMemberships: defineTable({
    householdId: v.id("households"),
    tokenIdentifier: v.string(),
  })
    .index("by_household", ["householdId"])
    .index("by_token", ["tokenIdentifier"]),

  invites: defineTable({
    code: v.string(),
    householdId: v.id("households"),
    createdByTokenIdentifier: v.string(),
    expiresAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_creator", ["createdByTokenIdentifier"])
    .index("by_household", ["householdId"]),
});
