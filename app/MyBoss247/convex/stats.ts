import { query } from "./_generated/server";

/**
 * Lifetime aggregate stats for the current user.
 */
export const lifetime = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return null;

    const [tasks, projects, payments, reviews, personalDays, checkIns] =
      await Promise.all([
        ctx.db
          .query("tasks")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
        ctx.db
          .query("projects")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
        ctx.db
          .query("penaltyPayments")
          .withIndex("by_payerUserId", (q) => q.eq("payerUserId", user._id))
          .collect(),
        ctx.db
          .query("performanceReviews")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
        ctx.db
          .query("personalDaysLog")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
        ctx.db
          .query("checkIns")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
      ]);

    const tasksCompleted = tasks.filter((t) => t.status === "completed").length;
    const tasksFailed = tasks.filter((t) => t.status === "failed").length;
    const tasksOverdue = tasks.filter((t) => t.status === "overdue").length;

    const projectsActive = projects.filter((p) => p.status === "active").length;
    const projectsArchived = projects.filter(
      (p) => p.status === "archived"
    ).length;

    const totalPaid = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
    const paymentsCount = payments.filter((p) => p.status !== "pending").length;

    const totalValueCaptured = reviews.reduce(
      (s, r) => s + (r.valueCaptured ?? 0),
      0
    );
    const totalValuePotential = reviews.reduce(
      (s, r) => s + (r.valuePotential ?? 0),
      0
    );
    const captureRate =
      totalValuePotential > 0
        ? Math.round((totalValueCaptured / totalValuePotential) * 100)
        : 0;

    const avgScore =
      reviews.length > 0
        ? Math.round(
            reviews.reduce((s, r) => s + r.score, 0) / reviews.length
          )
        : null;

    const checkInsTotal = checkIns.length;
    const checkInsResponded = checkIns.filter(
      (c) => c.status === "responded"
    ).length;
    const checkInResponseRate =
      checkInsTotal > 0
        ? Math.round((checkInsResponded / checkInsTotal) * 100)
        : 0;

    return {
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      tasksTotal: tasks.length,
      tasksCompleted,
      tasksFailed,
      tasksOverdue,
      projectsActive,
      projectsArchived,
      paymentsCount,
      totalPaid,
      totalValueCaptured,
      totalValuePotential,
      captureRate,
      reviewsCount: reviews.length,
      avgScore,
      personalDaysUsed: personalDays.length,
      checkInsTotal,
      checkInsResponded,
      checkInResponseRate,
      memberSince: user._creationTime,
    };
  },
});
