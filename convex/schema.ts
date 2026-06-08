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

  tasks: defineTable({
    householdId: v.id("households"),
    name: v.string(),
    category: v.union(
      v.literal("maintenance"),
      v.literal("cleaning"),
      v.literal("admin"),
      v.literal("groceries"),
      v.literal("other"),
    ),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
    note: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    // undefined = "Shared" (anyone can pick up); otherwise a specific member
    assigneeMembershipId: v.optional(v.id("householdMemberships")),
    recurrence: v.optional(
      v.object({
        frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
        interval: v.number(),
        rotateAssignee: v.boolean(),
      }),
    ),
    createdByTokenIdentifier: v.string(),
    completedAt: v.optional(v.number()),
  })
    .index("by_household_and_status", ["householdId", "status"])
    .index("by_household_and_assignee", ["householdId", "assigneeMembershipId"]),

  shoppingItems: defineTable({
    householdId: v.id("households"),
    name: v.string(),
    category: v.optional(v.string()),
    quantity: v.optional(v.string()),
    completed: v.boolean(),
    everCompleted: v.optional(v.boolean()),
    addedByTokenIdentifier: v.string(),
  })
    .index("by_household", ["householdId"])
    .index("by_household_and_completed", ["householdId", "completed"]),
});
