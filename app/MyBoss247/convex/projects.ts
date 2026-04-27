import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .first();
  if (!user) throw new Error("User not found");
  return user;
}

/**
 * List all active projects for the current user, ordered by sortOrder.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", user._id).eq("status", "active")
      )
      .collect();

    return projects.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/**
 * Create a new project. Returns the project id.
 */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    colour: v.optional(v.string()),
    icon: v.optional(v.string()),
    annualPotential: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Pick next sort order
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    const sortOrder = existing.length;

    // Default colour from a small palette
    const palette = ["#22C55E", "#F97316", "#8B5CF6", "#3B82F6", "#EC4899"];
    const colour = args.colour ?? palette[sortOrder % palette.length];

    const projectId = await ctx.db.insert("projects", {
      userId: user._id,
      title: args.title,
      description: args.description,
      colour,
      icon: args.icon ?? "💼",
      status: "active",
      sortOrder,
      annualPotential: args.annualPotential,
      progressPercentage: 0,
    });

    return projectId;
  },
});

/**
 * Update a project. Only the owner can update.
 */
export const update = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    colour: v.optional(v.string()),
    icon: v.optional(v.string()),
    annualPotential: v.optional(v.number()),
    sortOrder: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("paused"),
        v.literal("completed"),
        v.literal("archived")
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }
    const { projectId, ...patch } = args;
    const filtered = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(filtered).length > 0) {
      await ctx.db.patch(projectId, filtered);
    }
    return projectId;
  },
});

/**
 * Archive a project (we never delete, per PDR).
 */
export const archive = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }
    await ctx.db.patch(args.projectId, { status: "archived" });
  },
});
