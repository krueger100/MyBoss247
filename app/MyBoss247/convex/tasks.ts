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

/**
 * Get tasks for the current user on a specific date (YYYY-MM-DD).
 * Includes project info joined in for badges.
 */
export const listByDate = query({
  args: { dueDate: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId_dueDate", (q) =>
        q.eq("userId", user._id).eq("dueDate", args.dueDate)
      )
      .collect();

    // Enrich with project info for the UI badge
    const projectIds = [...new Set(tasks.map((t) => t.projectId))];
    const projects = await Promise.all(projectIds.map((id) => ctx.db.get(id)));
    const projectMap = new Map(
      projects.filter(Boolean).map((p) => [p!._id, p!])
    );

    return tasks
      .map((t) => ({
        ...t,
        projectTitle: projectMap.get(t.projectId)?.title ?? "Unknown",
        projectColor: projectMap.get(t.projectId)?.colour ?? "#22C55E",
      }))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },
});

/**
 * All tasks for the current user, ordered by due date asc then sortOrder.
 * Includes project info for badges.
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const projectIds = [...new Set(tasks.map((t) => t.projectId))];
    const projects = await Promise.all(projectIds.map((id) => ctx.db.get(id)));
    const projectMap = new Map(
      projects.filter(Boolean).map((p) => [p!._id, p!])
    );

    return tasks
      .map((t) => ({
        ...t,
        projectTitle: projectMap.get(t.projectId)?.title ?? "Unknown",
        projectColor: projectMap.get(t.projectId)?.colour ?? "#22C55E",
      }))
      .sort((a, b) => {
        if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });
  },
});

/**
 * Today's tasks shortcut — uses the user's local date in their timezone.
 * For simplicity we accept the date string from client (since timezone
 * conversion is easier on the client).
 */
export const today = query({
  args: { dueDate: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId_dueDate", (q) =>
        q.eq("userId", user._id).eq("dueDate", args.dueDate)
      )
      .collect();

    const projectIds = [...new Set(tasks.map((t) => t.projectId))];
    const projects = await Promise.all(projectIds.map((id) => ctx.db.get(id)));
    const projectMap = new Map(
      projects.filter(Boolean).map((p) => [p!._id, p!])
    );

    return tasks
      .map((t) => ({
        ...t,
        projectTitle: projectMap.get(t.projectId)?.title ?? "Unknown",
        projectColor: projectMap.get(t.projectId)?.colour ?? "#22C55E",
      }))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },
});

/**
 * Create a new task.
 */
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    goalId: v.optional(v.id("goals")),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.string(),
    dueTime: v.optional(v.string()),
    priority: v.optional(
      v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
    ),
    isRecurring: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Verify project belongs to user
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }

    // Pick sort order
    const sameDayTasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId_dueDate", (q) =>
        q.eq("userId", user._id).eq("dueDate", args.dueDate)
      )
      .collect();

    const taskId = await ctx.db.insert("tasks", {
      userId: user._id,
      projectId: args.projectId,
      goalId: args.goalId,
      title: args.title,
      description: args.description,
      dueDate: args.dueDate,
      dueTime: args.dueTime,
      priority: args.priority ?? "medium",
      status: "pending",
      warningLevel: "green",
      isRecurring: args.isRecurring ?? false,
      sortOrder: sameDayTasks.length,
    });

    return taskId;
  },
});

/**
 * Toggle a task between pending and completed.
 */
export const toggleComplete = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== user._id) {
      throw new Error("Task not found");
    }

    const now = Date.now();
    if (task.status === "completed") {
      await ctx.db.patch(args.taskId, {
        status: "pending",
        completedAt: undefined,
      });
    } else {
      await ctx.db.patch(args.taskId, {
        status: "completed",
        completedAt: now,
        warningLevel: "green",
      });
    }
  },
});

/**
 * Update task fields (title, due, priority, etc).
 */
export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    dueTime: v.optional(v.string()),
    priority: v.optional(
      v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
    ),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== user._id) {
      throw new Error("Task not found");
    }
    const { taskId, ...patch } = args;
    const filtered = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(filtered).length > 0) {
      await ctx.db.patch(taskId, filtered);
    }
  },
});

/**
 * Delete a task.
 */
export const remove = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== user._id) {
      throw new Error("Task not found");
    }
    await ctx.db.delete(args.taskId);
  },
});
