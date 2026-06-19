import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  internalQuery,
  internalAction,
} from "./_generated/server";
import { internal } from "./_generated/api";

type Personality = "drill_sergeant" | "tough_coach" | "supportive_manager";
type CheckInType =
  | "morning"
  | "midday"
  | "afternoon"
  | "evening"
  | "warning"
  | "inbox";

/**
 * Build an in-character check-in message from templates (no AI).
 * References the user's real task counts so it stays concrete.
 */
function buildCheckInMessage(
  type: CheckInType,
  personality: Personality,
  completed: number,
  total: number
): string {
  const remaining = Math.max(total - completed, 0);
  const s = (n: number) => (n === 1 ? "" : "s");
  switch (type) {
    case "morning":
      if (personality === "drill_sergeant")
        return `0800. ${total} task${s(total)} on the board. No excuses — move.`;
      if (personality === "supportive_manager")
        return `Good morning! ${total} task${s(total)} today — I know you can make real progress. Let's go.`;
      return `Morning. ${total} task${s(total)} today. Let's see what you're made of.`;
    case "midday":
      if (personality === "drill_sergeant")
        return `Noon. ${completed}/${total} done, ${remaining} still open. Pick up the pace.`;
      if (personality === "supportive_manager")
        return `Midday check — ${completed}/${total} done. Nice momentum; ${remaining} to go.`;
      return `It's noon. ${completed}/${total} done. Show me progress on the other ${remaining}.`;
    case "afternoon":
      if (personality === "drill_sergeant")
        return `1500. ${remaining} task${s(remaining)} left and the clock is winning. Fix that.`;
      if (personality === "supportive_manager")
        return `Afternoon! ${remaining} left — a focused push now and you finish strong.`;
      return `3pm. ${remaining} task${s(remaining)} remaining. Time's tightening — close them out.`;
    case "evening":
      if (personality === "drill_sergeant")
        return `End of day. ${completed}/${total} shipped. ${remaining > 0 ? `${remaining} unfinished. Unacceptable.` : "All clear. Adequate."}`;
      if (personality === "supportive_manager")
        return `Day's wrapping up — ${completed}/${total} done. ${remaining > 0 ? `${remaining} slipped, but tomorrow's a fresh start.` : "Full clear — proud of you!"}`;
      return `End of day. ${completed}/${total} done.${remaining > 0 ? ` ${remaining} unfinished — fix that tomorrow.` : " Clean sweep. That's what I expect."}`;
    case "warning":
      if (personality === "drill_sergeant")
        return `You're falling behind — ${remaining} task${s(remaining)} at risk. Handle it NOW.`;
      if (personality === "supportive_manager")
        return `Heads up — ${remaining} task${s(remaining)} slipping. Let's not let it pile up. What do you need?`;
      return `You're behind on ${remaining} task${s(remaining)}. Don't let it slide — act now.`;
    case "inbox":
    default:
      if (personality === "drill_sergeant")
        return `I pulled your numbers. ${completed}/${total} done. Explain.`;
      if (personality === "supportive_manager")
        return `Just checking in — ${completed}/${total} done so far. You've got this.`;
      return `Quick pulse check: ${completed}/${total} done. Keep moving.`;
  }
}

/**
 * Pending check-ins for the current user (not yet responded, scheduledFor <= now).
 */
export const pending = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];

    const now = Date.now();
    const items = await ctx.db
      .query("checkIns")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", user._id).eq("status", "pending")
      )
      .collect();
    return items
      .filter((c) => c.scheduledFor <= now)
      .sort((a, b) => a.scheduledFor - b.scheduledFor);
  },
});

/**
 * Recent check-in history (most recent first).
 */
export const recent = query({
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
      .query("checkIns")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit ?? 20);
  },
});

/**
 * Respond to a check-in. Marks completed task IDs and stores written response.
 */
export const respond = mutation({
  args: {
    checkInId: v.id("checkIns"),
    response: v.string(),
    completedTaskIds: v.optional(v.array(v.id("tasks"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const checkIn = await ctx.db.get(args.checkInId);
    if (!checkIn || checkIn.userId !== user._id) {
      throw new Error("Check-in not found");
    }
    if (checkIn.status !== "pending") {
      throw new Error("Already responded");
    }

    // Mark provided tasks as completed
    if (args.completedTaskIds && args.completedTaskIds.length > 0) {
      const now = Date.now();
      for (const taskId of args.completedTaskIds) {
        const task = await ctx.db.get(taskId);
        if (task && task.userId === user._id && task.status !== "completed") {
          await ctx.db.patch(taskId, {
            status: "completed",
            completedAt: now,
            warningLevel: "green",
          });
        }
      }
    }

    await ctx.db.patch(args.checkInId, {
      status: "responded",
      employeeResponse: args.response,
      respondedAt: Date.now(),
    });

    return { ok: true };
  },
});

/**
 * Internal — minimal context for templating a check-in.
 */
export const _checkInContext = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const todays = await ctx.db
      .query("tasks")
      .withIndex("by_userId_dueDate", (q) =>
        q.eq("userId", args.userId).eq("dueDate", todayStr)
      )
      .collect();
    return {
      personality: user.bossSettings.personality as Personality,
      total: todays.length,
      completed: todays.filter((t) => t.status === "completed").length,
    };
  },
});

/**
 * Internal — build a templated check-in (no AI) and insert it.
 * Called by the cron scheduler.
 */
export const _generateCheckIn = internalAction({
  args: {
    userId: v.id("users"),
    checkInType: v.union(
      v.literal("morning"),
      v.literal("midday"),
      v.literal("afternoon"),
      v.literal("evening"),
      v.literal("warning"),
      v.literal("inbox")
    ),
  },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.checkIns._checkInContext, {
      userId: args.userId,
    });
    if (!data) return;

    const bossMessage = buildCheckInMessage(
      args.checkInType,
      data.personality,
      data.completed,
      data.total
    );

    await ctx.runMutation(internal.checkIns._insertCheckIn, {
      userId: args.userId,
      bossMessage,
      checkInType: args.checkInType,
    });
  },
});

export const _insertCheckIn = internalMutation({
  args: {
    userId: v.id("users"),
    bossMessage: v.string(),
    checkInType: v.union(
      v.literal("morning"),
      v.literal("midday"),
      v.literal("afternoon"),
      v.literal("evening"),
      v.literal("warning"),
      v.literal("inbox")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("checkIns", {
      userId: args.userId,
      bossMessage: args.bossMessage,
      checkInType: args.checkInType,
      status: "pending",
      scheduledFor: Date.now(),
    });

    // Fire push notification
    const titleByType: Record<string, string> = {
      morning: "Morning Brief",
      midday: "Midday Check",
      afternoon: "Afternoon Push",
      evening: "End of Day Review",
      warning: "⚠️ Warning",
      inbox: "Boss Message",
    };
    await ctx.scheduler.runAfter(0, internal.notifications._sendPush, {
      userId: args.userId,
      title: titleByType[args.checkInType] ?? "Boss",
      body: args.bossMessage,
      data: { type: "check_in" },
    });
  },
});

/**
 * Internal — iterate users, decide which check-ins to fire now.
 * Called by cron every 15 minutes.
 */
export const _runScheduledCheckIns = internalAction({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runQuery(internal.checkIns._allActiveUsers, {});
    const now = new Date();
    const hourMinute = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    for (const user of users) {
      const times = user.bossSettings.checkinTimes;
      let type: "morning" | "midday" | "afternoon" | "evening" | undefined;

      // 15-min window check
      if (withinWindow(times.morning, hourMinute)) type = "morning";
      else if (withinWindow(times.midday, hourMinute)) type = "midday";
      else if (withinWindow(times.afternoon, hourMinute)) type = "afternoon";
      else if (withinWindow(times.evening, hourMinute)) type = "evening";

      if (!type) continue;

      // Already sent one of this type today?
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const sentToday = await ctx.runQuery(internal.checkIns._countTodayByType, {
        userId: user._id,
        checkInType: type,
        sinceMs: startOfDay.getTime(),
      });
      if (sentToday > 0) continue;

      await ctx.runAction(internal.checkIns._generateCheckIn, {
        userId: user._id,
        checkInType: type,
      });
    }
  },
});

function withinWindow(scheduled: string, current: string) {
  // Compare hour-minute strings — fire within the same 15-min cron tick
  const [sh, sm] = scheduled.split(":").map(Number);
  const [ch, cm] = current.split(":").map(Number);
  const sMin = sh * 60 + sm;
  const cMin = ch * 60 + cm;
  return Math.abs(cMin - sMin) <= 7; // ±7 min around scheduled time
}

export const _allActiveUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const _countTodayByType = internalQuery({
  args: {
    userId: v.id("users"),
    checkInType: v.union(
      v.literal("morning"),
      v.literal("midday"),
      v.literal("afternoon"),
      v.literal("evening"),
      v.literal("warning"),
      v.literal("inbox")
    ),
    sinceMs: v.number(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("checkIns")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    return all.filter(
      (c) =>
        c.checkInType === args.checkInType && c._creationTime >= args.sinceMs
    ).length;
  },
});

/**
 * Boss Inbox — fires unscheduled messages during working hours based on
 * each user's inboxFrequency setting. Called by an hourly cron.
 */
export const _runBossInbox = internalAction({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runQuery(internal.checkIns._allActiveUsers, {});
    const now = new Date();
    const hourMin = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const FREQ_CHANCE: Record<string, number> = {
      off: 0,
      light: 0.11,
      normal: 0.22,
      intense: 0.33,
    };

    for (const user of users) {
      const freq = user.bossSettings.inboxFrequency;
      const chance = FREQ_CHANCE[freq] ?? 0;
      if (chance === 0) continue;

      const start = user.bossSettings.workingHoursStart;
      const end = user.bossSettings.workingHoursEnd;
      if (hourMin < start || hourMin > end) continue;

      if (Math.random() > chance) continue;

      await ctx.runAction(internal.checkIns._generateCheckIn, {
        userId: user._id,
        checkInType: "inbox",
      });
    }
  },
});

/**
 * Manual trigger for testing — sends a check-in to the current user immediately.
 */
export const triggerNow = mutation({
  args: {
    checkInType: v.union(
      v.literal("morning"),
      v.literal("midday"),
      v.literal("afternoon"),
      v.literal("evening"),
      v.literal("warning"),
      v.literal("inbox")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    await ctx.scheduler.runAfter(0, internal.checkIns._generateCheckIn, {
      userId: user._id,
      checkInType: args.checkInType,
    });
  },
});
