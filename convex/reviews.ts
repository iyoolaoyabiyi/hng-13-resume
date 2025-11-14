import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getReviews = query({
  handler: async (ctx) => {
    return await ctx.db.query("reviews").order("desc").collect();
  },
});

export const createReview = mutation({
  args: {
    name: v.string(),
    comment: v.string(),
    rating: v.number(),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const comment = args.comment.trim();
    const rating = Math.round(args.rating);

    if (!name || !comment) {
      throw new Error("Name and comment are required");
    }

    if (rating < 1 || rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    await ctx.db.insert("reviews", {
      name,
      comment,
      rating,
      createdAt: Date.now(),
    });
  },
});
