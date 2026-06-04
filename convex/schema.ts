import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  invites: defineTable({
    code: v.string(),
    createdByTokenIdentifier: v.string(),
  })
    .index("by_code", ["code"])
    .index("by_creator", ["createdByTokenIdentifier"]),
});
