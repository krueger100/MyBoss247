import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Compute the next due date for a recurring task.
 */
function computeNextDueDate(
  currentDate: string,
  rule: {
    frequency: "daily" | "weekdays" | "weekly" | "monthly";
    daysOfWeek?: number[];
    dayOfMonth?: number;
  }
): string | null {
  const d = new Date(currentDate + "T00:00:00");
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const fmt = (x: Date) =>
    `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;

  if (rule.frequency === "daily") {
    d.setDate(d.getDate() + 1);
    return fmt(d);
  }
  if (rule.frequency === "weekdays") {
    do {
      d.setDate(d.getDate() + 1);
    } while (d.getDay() === 0 || d.getDay() === 6);
    return fmt(d);
  }
  if (rule.frequency === "weekly") {
    if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) {
      d.setDate(d.getDate() + 7);
      return fmt(d);
    }
    // Find next allowed weekday
    const sorted = [...rule.daysOfWeek].sort();
    let attempts = 0;
    do {
      d.setDate(d.getDate() + 1);
      attempts++;
      if (sorted.includes(d.getDay())) return fmt(d);
    } while (attempts < 14);
    return null;
  }
  if (rule.frequency === "monthly") {
    const dom = rule.dayOfMonth ?? d.getDate();
    const next = new Date(d.getFullYear(), d.getMonth() + 1, dom);
    return fmt(next);
  }
  return null;
}

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
    recurrenceRule: v.optional(
      v.object({
        frequency: v.union(
          v.literal("daily"),
          v.literal("weekdays"),
          v.literal("weekly"),
          v.literal("monthly")
        ),
        daysOfWeek: v.optional(v.array(v.number())),
        dayOfMonth: v.optional(v.number()),
      })
    ),
    addToChallenges: v.optional(v.array(v.id("challenges"))),
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
      recurrenceRule: args.recurrenceRule,
      sortOrder: sameDayTasks.length,
    });

    await recalculateProjectProgress(ctx, args.projectId, user._id);

    // Link to any challenges chosen
    if (args.addToChallenges && args.addToChallenges.length > 0) {
      for (const challengeId of args.addToChallenges) {
        await ctx.db.insert("challengeTasks", {
          challengeId,
          taskId,
          userId: user._id,
          countedForChallenge: true,
        });
      }
      await recalcChallengesForTask(ctx, taskId, user._id);
    }

    return taskId;
  },
});

/**
 * Recalculate challenge participant progress for any challenges this task belongs to.
 */
async function recalcChallengesForTask(
  ctx: MutationCtx,
  taskId: any,
  userId: any
) {
  const challengeTaskRows = await ctx.db
    .query("challengeTasks")
    .withIndex("by_taskId", (q) => q.eq("taskId", taskId))
    .collect();

  // Distinct challenge IDs this task contributes to
  const challengeIds = [
    ...new Set(challengeTaskRows.map((ct) => ct.challengeId)),
  ];

  for (const challengeId of challengeIds) {
    const challengeTasks = await ctx.db
      .query("challengeTasks")
      .withIndex("by_challengeId", (q) => q.eq("challengeId", challengeId))
      .collect();

    // For each participant (any user_id in challengeTasks), recalc their %
    const participantUserIds = [
      ...new Set(challengeTasks.map((ct) => ct.userId)),
    ];
    for (const pUserId of participantUserIds) {
      const myRows = challengeTasks.filter(
        (ct) => ct.userId === pUserId && ct.countedForChallenge
      );
      let done = 0;
      for (const row of myRows) {
        const t = await ctx.db.get(row.taskId);
        if (t?.status === "completed") done++;
      }
      const total = myRows.length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;

      const participantRows = await ctx.db
        .query("challengeParticipants")
        .withIndex("by_challengeId", (q) => q.eq("challengeId", challengeId))
        .collect();
      const myParticipant = participantRows.find((p) => p.userId === pUserId);
      if (myParticipant) {
        await ctx.db.patch(myParticipant._id, {
          tasksCompleted: done,
          tasksTotal: total,
          completionPercentage: pct,
        });
      }
    }
  }
}

/**
 * Recalculate a project's progress percentage from its tasks.
 */
async function recalculateProjectProgress(
  ctx: MutationCtx,
  projectId: any,
  userId: any
) {
  const projectTasks = await ctx.db
    .query("tasks")
    .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
    .collect();
  const userTasks = projectTasks.filter((t) => t.userId === userId);
  if (userTasks.length === 0) {
    await ctx.db.patch(projectId, { progressPercentage: 0 });
    return;
  }
  const done = userTasks.filter((t) => t.status === "completed").length;
  const pct = Math.round((done / userTasks.length) * 100);
  await ctx.db.patch(projectId, { progressPercentage: pct });
}

/**
 * Toggle a task between pending and completed. Recalculates parent project progress.
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
    const wasCompleted = task.status === "completed";
    if (wasCompleted) {
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

      // If recurring, spawn the next instance.
      if (task.isRecurring && task.recurrenceRule) {
        const nextDue = computeNextDueDate(
          task.dueDate,
          task.recurrenceRule
        );
        if (nextDue) {
          // Check we haven't already created the next instance
          const sameDay = await ctx.db
            .query("tasks")
            .withIndex("by_userId_dueDate", (q) =>
              q.eq("userId", user._id).eq("dueDate", nextDue)
            )
            .collect();
          const dupe = sameDay.find(
            (t) => t.title === task.title && t.projectId === task.projectId
          );
          if (!dupe) {
            await ctx.db.insert("tasks", {
              userId: user._id,
              projectId: task.projectId,
              goalId: task.goalId,
              title: task.title,
              description: task.description,
              dueDate: nextDue,
              dueTime: task.dueTime,
              priority: task.priority,
              status: "pending",
              warningLevel: "green",
              isRecurring: true,
              recurrenceRule: task.recurrenceRule,
              sortOrder: 0,
            });
          }
        }
      }
    }

    await recalculateProjectProgress(ctx, task.projectId, user._id);
    await recalcChallengesForTask(ctx, args.taskId, user._id);
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
    const projectId = task.projectId;
    // Clean up any challengeTasks rows that reference this task
    const ctRows = await ctx.db
      .query("challengeTasks")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .collect();
    for (const row of ctRows) await ctx.db.delete(row._id);

    await ctx.db.delete(args.taskId);
    await recalculateProjectProgress(ctx, projectId, user._id);

    // Recalc each affected challenge
    const affected = [...new Set(ctRows.map((r) => r.challengeId))];
    for (const cId of affected) {
      const participants = await ctx.db
        .query("challengeParticipants")
        .withIndex("by_challengeId", (q) => q.eq("challengeId", cId))
        .collect();
      const remaining = await ctx.db
        .query("challengeTasks")
        .withIndex("by_challengeId", (q) => q.eq("challengeId", cId))
        .collect();
      for (const pp of participants) {
        const myRows = remaining.filter(
          (r) => r.userId === pp.userId && r.countedForChallenge
        );
        let done = 0;
        for (const row of myRows) {
          const t = await ctx.db.get(row.taskId);
          if (t?.status === "completed") done++;
        }
        const total = myRows.length;
        await ctx.db.patch(pp._id, {
          tasksCompleted: done,
          tasksTotal: total,
          completionPercentage: total > 0 ? Math.round((done / total) * 100) : 0,
        });
      }
    }
  },
});
