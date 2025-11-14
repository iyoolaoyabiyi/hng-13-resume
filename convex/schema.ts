import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  reviews: defineTable({
    name: v.string(),
    comment: v.string(),
    rating: v.number(),
    createdAt: v.number(),
  }),
});
