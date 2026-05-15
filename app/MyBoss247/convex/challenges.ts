import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Create a 1v1 challenge between two active partners.
 * Both participants are auto-enrolled.
 */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    opponentUserId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    stakeAmount: v.number(),
    penaltyTarget: v.union(v.literal("charity"), v.literal("winner")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const me = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!me) throw new Error("User not found");
    if (me._id === args.opponentUserId) throw new Error("Can't challenge yourself");

    const challengeId = await ctx.db.insert("challenges", {
      createdBy: me._id,
      title: args.title,
      description: args.description,
      startDate: args.startDate,
      endDate: args.endDate,
      stakeAmount: args.stakeAmount,
      penaltyTarget: args.penaltyTarget,
      status: "active",
    });

    await ctx.db.insert("challengeParticipants", {
      challengeId,
      userId: me._id,
      tasksCompleted: 0,
      tasksTotal: 0,
      completionPercentage: 0,
      status: "active",
    });
    await ctx.db.insert("challengeParticipants", {
      challengeId,
      userId: args.opponentUserId,
      tasksCompleted: 0,
      tasksTotal: 0,
      completionPercentage: 0,
      status: "active",
    });

    return challengeId;
  },
});

/**
 * List challenges I'm participating in.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const me = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!me) return [];

    const myParticipations = await ctx.db
      .query("challengeParticipants")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .collect();

    const results = await Promise.all(
      myParticipations.map(async (p) => {
        const challenge = await ctx.db.get(p.challengeId);
        if (!challenge) return null;

        // Get all participants for this challenge
        const allParticipants = await ctx.db
          .query("challengeParticipants")
          .withIndex("by_challengeId", (q) => q.eq("challengeId", challenge._id))
          .collect();

        const enrichedParticipants = await Promise.all(
          allParticipants.map(async (cp) => {
            const u = await ctx.db.get(cp.userId);
            return {
              userId: cp.userId,
              displayName: u?.displayName ?? "Unknown",
              avatarUrl: u?.avatarUrl,
              tasksCompleted: cp.tasksCompleted,
              tasksTotal: cp.tasksTotal,
              completionPercentage: cp.completionPercentage,
              status: cp.status,
              isMe: cp.userId === me._id,
            };
          })
        );

        return {
          ...challenge,
          participants: enrichedParticipants,
          myStatus: p.status,
        };
      })
    );

    return results
      .filter((c) => c !== null && c.status !== "cancelled")
      .sort((a, b) => b!.startDate.localeCompare(a!.startDate));
  },
});

/**
 * Get full challenge detail.
 */
export const get = query({
  args: { challengeId: v.id("challenges") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const me = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!me) return null;

    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) return null;

    const allParticipants = await ctx.db
      .query("challengeParticipants")
      .withIndex("by_challengeId", (q) => q.eq("challengeId", challenge._id))
      .collect();

    const meIn = allParticipants.find((p) => p.userId === me._id);
    if (!meIn) return null;

    const participants = await Promise.all(
      allParticipants.map(async (cp) => {
        const u = await ctx.db.get(cp.userId);
        return {
          userId: cp.userId,
          displayName: u?.displayName ?? "Unknown",
          avatarUrl: u?.avatarUrl,
          tasksCompleted: cp.tasksCompleted,
          tasksTotal: cp.tasksTotal,
          completionPercentage: cp.completionPercentage,
          status: cp.status,
          isMe: cp.userId === me._id,
        };
      })
    );

    return { ...challenge, participants };
  },
});

/**
 * Add a task to a challenge's scope. Counted toward the participant's progress.
 */
export const addTask = mutation({
  args: {
    challengeId: v.id("challenges"),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const me = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!me) throw new Error("User not found");

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== me._id) throw new Error("Task not found");

    // Already added?
    const existing = await ctx.db
      .query("challengeTasks")
      .withIndex("by_challengeId", (q) => q.eq("challengeId", args.challengeId))
      .collect();
    if (existing.find((ct) => ct.taskId === args.taskId)) return;

    await ctx.db.insert("challengeTasks", {
      challengeId: args.challengeId,
      taskId: args.taskId,
      userId: me._id,
      countedForChallenge: true,
    });

    await recalcParticipant(ctx, args.challengeId, me._id);
  },
});

async function recalcParticipant(ctx: any, challengeId: Id<"challenges">, userId: Id<"users">) {
  const challengeTasks = await ctx.db
    .query("challengeTasks")
    .withIndex("by_challengeId", (q: any) => q.eq("challengeId", challengeId))
    .collect();
  const myTaskRows = challengeTasks.filter(
    (ct: any) => ct.userId === userId && ct.countedForChallenge
  );

  let completed = 0;
  for (const ct of myTaskRows) {
    const t = await ctx.db.get(ct.taskId);
    if (t?.status === "completed") completed++;
  }
  const total = myTaskRows.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const participant = await ctx.db
    .query("challengeParticipants")
    .withIndex("by_challengeId", (q: any) => q.eq("challengeId", challengeId))
    .collect();
  const myRow = participant.find((p: any) => p.userId === userId);
  if (myRow) {
    await ctx.db.patch(myRow._id, {
      tasksCompleted: completed,
      tasksTotal: total,
      completionPercentage: pct,
    });
  }
}

/**
 * Recalculate progress for the calling user (call after task changes externally).
 * Also useful as a manual refresh trigger.
 */
export const recalcMyProgress = mutation({
  args: { challengeId: v.id("challenges") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const me = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!me) throw new Error("User not found");
    await recalcParticipant(ctx, args.challengeId, me._id);
  },
});
