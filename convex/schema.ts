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

  shoppingItems: defineTable({
    householdId: v.id("households"),
    name: v.string(),
    category: v.optional(v.string()),
    quantity: v.optional(v.string()),
    completed: v.boolean(),
    addedByTokenIdentifier: v.string(),
  })
    .index("by_household", ["householdId"])
    .index("by_household_and_completed", ["householdId", "completed"]),
});
