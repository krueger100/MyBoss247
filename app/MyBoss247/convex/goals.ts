import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";

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

const TIMEFRAMES = [
  "yearly",
  "quarterly",
  "monthly",
  "weekly",
  "daily",
  "milestone",
] as const;

/**
 * List goals for a project.
 */
export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();

    return goals.filter((g) => g.userId === user._id);
  },
});

/**
 * Get a single goal with its child goals.
 */
export const get = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return null;

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== user._id) return null;

    const children = await ctx.db
      .query("goals")
      .withIndex("by_parentGoalId", (q) => q.eq("parentGoalId", args.goalId))
      .collect();

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_goalId", (q) => q.eq("goalId", args.goalId))
      .collect();

    return { ...goal, children, tasks };
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    timeframe: v.union(
      v.literal("yearly"),
      v.literal("quarterly"),
      v.literal("monthly"),
      v.literal("weekly"),
      v.literal("daily"),
      v.literal("milestone")
    ),
    startDate: v.string(),
    dueDate: v.string(),
    parentGoalId: v.optional(v.id("goals")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) throw new Error("Project not found");

    return await ctx.db.insert("goals", {
      userId: user._id,
      projectId: args.projectId,
      title: args.title,
      description: args.description,
      timeframe: args.timeframe,
      startDate: args.startDate,
      dueDate: args.dueDate,
      status: "active",
      parentGoalId: args.parentGoalId,
      progressPercentage: 0,
    });
  },
});

export const update = mutation({
  args: {
    goalId: v.id("goals"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("paused")
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== user._id) throw new Error("Goal not found");

    const { goalId, ...patch } = args;
    const filtered = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(filtered).length > 0) {
      await ctx.db.patch(goalId, filtered);
    }
  },
});

export const remove = mutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== user._id) throw new Error("Goal not found");

    // Cascade: unlink child goals + tasks
    const children = await ctx.db
      .query("goals")
      .withIndex("by_parentGoalId", (q) => q.eq("parentGoalId", args.goalId))
      .collect();
    for (const c of children) {
      await ctx.db.patch(c._id, { parentGoalId: undefined });
    }
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_goalId", (q) => q.eq("goalId", args.goalId))
      .collect();
    for (const t of tasks) {
      await ctx.db.patch(t._id, { goalId: undefined });
    }

    await ctx.db.delete(args.goalId);
  },
});
