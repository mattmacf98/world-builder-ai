import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  worlds: defineTable({
    glTFXStorageId: v.string(),
    glTFXUrl: v.optional(v.string()),
    assetStorageIds: v.array(v.string()),
    assetUrls: v.optional(v.array(v.string())),
    createdAt: v.number(),
    name: v.string(),
  }),
});