import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  worlds: defineTable({
    glTFXStorageId: v.string(),
    glTFXUrl: v.optional(v.string()),
    assetUriToStorageIds: v.array(v.object({
      uri: v.string(),
      storageId: v.string(),
    })),
    assetUriToUrls: v.optional(v.array(v.object({
      uri: v.string(),
      url: v.string(),
    }))),
    createdAt: v.number(),
    name: v.string(),
  }),
  macros: defineTable({
    name: v.string(),
    macroStorageId: v.string(),
    macroUrl: v.optional(v.string()),
    activationPhrases: v.array(v.string()),
    actions: v.array(v.string()),
    createdAt: v.number(),
  }),
});
