import { query } from "./_generated/server";

/**
 * Computed badge catalogue. Each badge has a predicate that's evaluated
 * against the user's lifetime stats. No separate "unlocks" table needed —
 * the computation IS the unlock state. Stable IDs allow ordering.
 */

export type Badge = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  unlocked: boolean;
  progress?: { current: number; goal: number };
};

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

    const [tasks, projects, partnerships, challengeParticipants, reviews, payments] =
      await Promise.all([
        ctx.db
          .query("tasks")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
        ctx.db
          .query("projects")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
        Promise.all([
          ctx.db
            .query("partnerships")
            .withIndex("by_partnerAId", (q) => q.eq("partnerAId", user._id))
            .collect(),
          ctx.db
            .query("partnerships")
            .withIndex("by_partnerBId", (q) => q.eq("partnerBId", user._id))
            .collect(),
        ]).then(([a, b]) => [...a, ...b]),
        ctx.db
          .query("challengeParticipants")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
        ctx.db
          .query("performanceReviews")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
        ctx.db
          .query("penaltyPayments")
          .withIndex("by_payerUserId", (q) => q.eq("payerUserId", user._id))
          .collect(),
      ]);

    const tasksCompleted = tasks.filter((t) => t.status === "completed").length;
    const projectsActive = projects.filter((p) => p.status === "active").length;
    const activePartnerships = partnerships.filter(
      (p) => p.status === "active"
    ).length;
    const challengesWon = challengeParticipants.filter(
      (p) => p.status === "won"
    ).length;
    const lifetimeCaptured = reviews.reduce(
      (s, r) => s + (r.valueCaptured ?? 0),
      0
    );
    const totalReviews = reviews.length;
    const avgScore =
      totalReviews > 0
        ? reviews.reduce((s, r) => s + r.score, 0) / totalReviews
        : 0;
    const totalPaid = payments.reduce((s, p) => s + (p.amount ?? 0), 0);

    const badges: Badge[] = [
      {
        id: "first_hire",
        name: "First Hire",
        description: "Created your first project",
        emoji: "💼",
        tier: "bronze",
        unlocked: projectsActive >= 1,
        progress: { current: projectsActive, goal: 1 },
      },
      {
        id: "clocked_in",
        name: "Clocked In",
        description: "Signed your Employment Contract",
        emoji: "✍️",
        tier: "bronze",
        unlocked: !!user.contractSignedAt,
      },
      {
        id: "first_three",
        name: "Off the Bench",
        description: "Completed 3 tasks",
        emoji: "👟",
        tier: "bronze",
        unlocked: tasksCompleted >= 3,
        progress: { current: Math.min(tasksCompleted, 3), goal: 3 },
      },
      {
        id: "ten_tasks",
        name: "Worker Bee",
        description: "Completed 10 tasks",
        emoji: "🐝",
        tier: "bronze",
        unlocked: tasksCompleted >= 10,
        progress: { current: Math.min(tasksCompleted, 10), goal: 10 },
      },
      {
        id: "fifty_tasks",
        name: "Veteran",
        description: "Completed 50 tasks",
        emoji: "🛠",
        tier: "silver",
        unlocked: tasksCompleted >= 50,
        progress: { current: Math.min(tasksCompleted, 50), goal: 50 },
      },
      {
        id: "hundred_tasks",
        name: "Iron Will",
        description: "Completed 100 tasks",
        emoji: "💎",
        tier: "gold",
        unlocked: tasksCompleted >= 100,
        progress: { current: Math.min(tasksCompleted, 100), goal: 100 },
      },
      {
        id: "thousand_tasks",
        name: "Untouchable",
        description: "Completed 1,000 tasks",
        emoji: "🏛",
        tier: "platinum",
        unlocked: tasksCompleted >= 1000,
        progress: { current: Math.min(tasksCompleted, 1000), goal: 1000 },
      },
      {
        id: "week_streak",
        name: "Week One",
        description: "7-day streak",
        emoji: "🔥",
        tier: "bronze",
        unlocked: user.longestStreak >= 7,
        progress: { current: Math.min(user.longestStreak, 7), goal: 7 },
      },
      {
        id: "month_streak",
        name: "On the Payroll",
        description: "30-day streak",
        emoji: "📅",
        tier: "silver",
        unlocked: user.longestStreak >= 30,
        progress: { current: Math.min(user.longestStreak, 30), goal: 30 },
      },
      {
        id: "year_streak",
        name: "Lifer",
        description: "365-day streak",
        emoji: "👑",
        tier: "platinum",
        unlocked: user.longestStreak >= 365,
        progress: { current: Math.min(user.longestStreak, 365), goal: 365 },
      },
      {
        id: "captured_10k",
        name: "First Ten K",
        description: "Captured $10,000 in opportunity value",
        emoji: "💵",
        tier: "bronze",
        unlocked: lifetimeCaptured >= 10000,
        progress: { current: Math.min(lifetimeCaptured, 10000), goal: 10000 },
      },
      {
        id: "captured_100k",
        name: "Six Figures",
        description: "Captured $100,000 in opportunity value",
        emoji: "💰",
        tier: "silver",
        unlocked: lifetimeCaptured >= 100000,
        progress: { current: Math.min(lifetimeCaptured, 100000), goal: 100000 },
      },
      {
        id: "captured_1m",
        name: "Seven Figures",
        description: "Captured $1,000,000 in opportunity value",
        emoji: "🪙",
        tier: "platinum",
        unlocked: lifetimeCaptured >= 1000000,
        progress: { current: Math.min(lifetimeCaptured, 1000000), goal: 1000000 },
      },
      {
        id: "squad_goals",
        name: "Squad Goals",
        description: "Joined forces with an accountability partner",
        emoji: "🤝",
        tier: "bronze",
        unlocked: activePartnerships >= 1,
      },
      {
        id: "first_blood",
        name: "First Blood",
        description: "Won your first challenge",
        emoji: "🥊",
        tier: "silver",
        unlocked: challengesWon >= 1,
      },
      {
        id: "champion",
        name: "Champion",
        description: "Won 10 challenges",
        emoji: "🏆",
        tier: "gold",
        unlocked: challengesWon >= 10,
        progress: { current: Math.min(challengesWon, 10), goal: 10 },
      },
      {
        id: "perfect_review",
        name: "Perfect Review",
        description: "Scored 100 on a weekly performance review",
        emoji: "💯",
        tier: "gold",
        unlocked: reviews.some((r) => r.score >= 100),
      },
      {
        id: "consistent_high_performer",
        name: "Consistent Performer",
        description: "Average review score above 80 with 4+ reviews",
        emoji: "⭐",
        tier: "silver",
        unlocked: totalReviews >= 4 && avgScore >= 80,
      },
      {
        id: "stripe_baptism",
        name: "Pain Tolerance",
        description: "Took your first penalty charge",
        emoji: "💸",
        tier: "bronze",
        unlocked: totalPaid > 0,
      },
      {
        id: "boss_chat_50",
        name: "Therapy Sessions",
        description: "Sent 50 messages to the Boss",
        emoji: "💬",
        tier: "silver",
        unlocked: false,
        // Computed elsewhere if needed; left dormant for v1
      },
    ];

    return badges;
  },
});
