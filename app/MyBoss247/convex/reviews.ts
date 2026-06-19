import { v } from "convex/values";
import {
  query,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";

const NEXT_WEEK_CLOSE: Record<string, string> = {
  drill_sergeant: "No excuses next week. Execute.",
  tough_coach: "Match your earning potential. Every hour matters.",
  supportive_manager: "Proud of the effort — let's build on it next week.",
};

/**
 * List the user's performance reviews, most recent first.
 */
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];

    return await ctx.db
      .query("performanceReviews")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit ?? 20);
  },
});

/**
 * Get a single review.
 */
export const get = query({
  args: { reviewId: v.id("performanceReviews") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return null;
    const review = await ctx.db.get(args.reviewId);
    if (!review || review.userId !== user._id) return null;
    return review;
  },
});

/**
 * Internal — gather a week's data for a user.
 */
export const _gatherWeekData = internalQuery({
  args: {
    userId: v.id("users"),
    weekStart: v.string(), // YYYY-MM-DD
    weekEnd: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    const weekTasks = tasks.filter(
      (t) => t.dueDate >= args.weekStart && t.dueDate <= args.weekEnd
    );

    const completed = weekTasks.filter((t) => t.status === "completed").length;
    const overdue = weekTasks.filter((t) => t.status === "overdue").length;

    const startMs = Date.parse(args.weekStart + "T00:00:00");
    const endMs = Date.parse(args.weekEnd + "T23:59:59");
    const payments = await ctx.db
      .query("penaltyPayments")
      .withIndex("by_payerUserId", (q) => q.eq("payerUserId", args.userId))
      .collect();
    const weekPayments = payments.filter(
      (p) => p.chargedAt && p.chargedAt >= startMs && p.chargedAt <= endMs
    );

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", args.userId).eq("status", "active")
      )
      .collect();

    const totalDailyPotential = projects.reduce(
      (sum, p) => sum + Math.round(p.annualPotential / 365),
      0
    );

    const byDay: Record<string, { done: number; total: number }> = {};
    for (const t of weekTasks) {
      const k = t.dueDate;
      if (!byDay[k]) byDay[k] = { done: 0, total: 0 };
      byDay[k].total++;
      if (t.status === "completed") byDay[k].done++;
    }
    let valueCaptured = 0;
    for (const k of Object.keys(byDay)) {
      const ratio = byDay[k].total > 0 ? byDay[k].done / byDay[k].total : 0;
      valueCaptured += Math.round(totalDailyPotential * ratio);
    }
    const valuePotential = totalDailyPotential * 7;

    return {
      displayName: user.displayName,
      personality: user.bossSettings.personality,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      tasksCompleted: completed,
      tasksTotal: weekTasks.length,
      tasksOverdue: overdue,
      penaltiesTriggered: weekPayments.length,
      penaltyTotal: weekPayments.reduce((s, p) => s + (p.amount ?? 0), 0),
      valueCaptured,
      valuePotential,
      projectsSummary: projects.map((p) => ({
        title: p.title,
        progress: Math.round(p.progressPercentage),
      })),
    };
  },
});

export const _insertReview = internalMutation({
  args: {
    userId: v.id("users"),
    weekStartDate: v.string(),
    weekEndDate: v.string(),
    score: v.number(),
    tasksCompleted: v.number(),
    tasksTotal: v.number(),
    penaltiesTriggered: v.number(),
    penaltyTotal: v.number(),
    reviewText: v.string(),
    valueCaptured: v.number(),
    valuePotential: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("performanceReviews", args);
  },
});

/**
 * Internal — generate a single templated review (no AI) for one user.
 */
export const _generateReview = internalAction({
  args: {
    userId: v.id("users"),
    weekStart: v.string(),
    weekEnd: v.string(),
  },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.reviews._gatherWeekData, {
      userId: args.userId,
      weekStart: args.weekStart,
      weekEnd: args.weekEnd,
    });
    if (!data) return;

    const completionRate =
      data.tasksTotal > 0
        ? Math.round((data.tasksCompleted / data.tasksTotal) * 100)
        : 0;
    const captureRate =
      data.valuePotential > 0
        ? Math.round((data.valueCaptured / data.valuePotential) * 100)
        : 0;
    // Score: weighted 60% task completion + 40% capture rate
    const score = Math.round(completionRate * 0.6 + captureRate * 0.4);

    const factSheet = `Week: ${args.weekStart} → ${args.weekEnd}
Tasks: ${data.tasksCompleted}/${data.tasksTotal} completed (${completionRate}%)
Overdue: ${data.tasksOverdue}
Penalties triggered: ${data.penaltiesTriggered} ($${data.penaltyTotal})
Value captured: $${data.valueCaptured.toLocaleString()} of $${data.valuePotential.toLocaleString()} (${captureRate}%)
Current streak: ${data.currentStreak} days
Longest streak: ${data.longestStreak} days
Projects:
${data.projectsSummary.map((p) => `  • ${p.title}: ${p.progress}%`).join("\n")}`;

    const close =
      NEXT_WEEK_CLOSE[data.personality] ?? NEXT_WEEK_CLOSE.tough_coach;

    const reviewText = `# Weekly Performance Review

**Score: ${score}/100**

${factSheet}

## Summary
${
  score >= 80
    ? "Strong week. Keep that pace."
    : score >= 60
      ? "Decent effort. Room to tighten up."
      : "Disappointing. We need to talk about your execution."
}

## What went well
${data.tasksCompleted > 0 ? `You completed ${data.tasksCompleted} task${data.tasksCompleted === 1 ? "" : "s"} this week.` : "Nothing notable."}

## What needs improvement
${data.tasksOverdue > 0 ? `${data.tasksOverdue} task${data.tasksOverdue === 1 ? "" : "s"} went overdue.` : "Stay focused and keep the streak alive."}

## Next week
${close}`;

    await ctx.runMutation(internal.reviews._insertReview, {
      userId: args.userId,
      weekStartDate: args.weekStart,
      weekEndDate: args.weekEnd,
      score,
      tasksCompleted: data.tasksCompleted,
      tasksTotal: data.tasksTotal,
      penaltiesTriggered: data.penaltiesTriggered,
      penaltyTotal: data.penaltyTotal,
      reviewText,
      valueCaptured: data.valueCaptured,
      valuePotential: data.valuePotential,
    });
  },
});

/**
 * Cron entry — Sunday evening. Generates reviews for all users for the week
 * just ended (Mon → Sun).
 */
export const _runWeeklyReviews = internalAction({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runQuery(internal.checkIns._allActiveUsers, {});

    const today = new Date();
    const dow = today.getDay(); // 0=Sun
    const daysSinceMonday = dow === 0 ? 6 : dow - 1;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - daysSinceMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    for (const user of users) {
      await ctx.runAction(internal.reviews._generateReview, {
        userId: user._id,
        weekStart: fmt(weekStart),
        weekEnd: fmt(weekEnd),
      });
    }
  },
});

/**
 * Manual trigger — generate a review for the current user for the past 7 days.
 */
export const triggerNow = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);

    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    await ctx.runAction(internal.reviews._generateReview, {
      userId: args.userId,
      weekStart: fmt(weekStart),
      weekEnd: fmt(today),
    });
  },
});

import { mutation as publicMutation } from "./_generated/server";

export const triggerNowForMe = publicMutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    await ctx.scheduler.runAfter(0, internal.reviews.triggerNow, {
      userId: user._id,
    });
  },
});
