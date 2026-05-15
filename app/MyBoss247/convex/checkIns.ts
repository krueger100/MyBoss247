import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  internalQuery,
  internalAction,
} from "./_generated/server";
import { internal } from "./_generated/api";

const PERSONALITY_TONES: Record<string, string> = {
  drill_sergeant: "Aggressive, zero tolerance, military-style. Use short bark commands.",
  tough_coach: "Firm but fair. Direct. Results-focused. No coddling.",
  supportive_manager: "Encouraging, empathetic, but still holds accountability.",
};

const TYPE_DIRECTIVES: Record<string, string> = {
  morning:
    "It's morning. Brief them on today's tasks. Set expectations. Tone: directive, agenda-setting.",
  midday:
    "It's noon. Demand a progress update. Tone: firm, expects an answer.",
  afternoon:
    "It's 3pm. Count remaining tasks. Tone: urgent, time pressure.",
  evening:
    "It's 6pm. Review what was accomplished today. Tone: evaluative.",
  warning:
    "A task is overdue or close to overdue. Tone: escalated, demands action.",
  inbox:
    "Random check during work hours. Short, unexpected. Reference one specific data point.",
};

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
    return items.filter((c) => c.scheduledFor <= now).sort((a, b) => a.scheduledFor - b.scheduledFor);
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
    const completedTitles: string[] = [];
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
          completedTitles.push(task.title);
        }
      }
    }

    await ctx.db.patch(args.checkInId, {
      status: "responded",
      employeeResponse: args.response,
      respondedAt: Date.now(),
    });

    // Mirror the employee's response into chat so the conversation has continuity
    const chatContent = [
      completedTitles.length > 0
        ? `✓ ${completedTitles.join("\n✓ ")}`
        : "",
      args.response,
    ]
      .filter(Boolean)
      .join("\n\n");

    if (chatContent) {
      await ctx.db.insert("chatMessages", {
        userId: user._id,
        role: "employee",
        content: chatContent,
        status: "sent",
      });
    }

    return { ok: true };
  },
});

/**
 * Internal — generate a check-in via Claude and insert it.
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
    const data = await ctx.runQuery(internal.chat._gatherContext, {
      userId: args.userId,
    });
    if (!data) return;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    let bossMessage: string;

    if (!apiKey) {
      // Graceful fallback so check-ins still happen without API
      const fallbacks: Record<string, string> = {
        morning: `Morning. ${data.todaysTasks.length} tasks waiting. Get to work.`,
        midday: `It's noon. Show me progress.`,
        afternoon: `3pm. Time's running out. How many done?`,
        evening: `End of day. What did you ship?`,
        warning: `You're falling behind. Fix this.`,
        inbox: `Status update. Now.`,
      };
      bossMessage = fallbacks[args.checkInType];
    } else {
      const personality = PERSONALITY_TONES[data.personality] ?? PERSONALITY_TONES.tough_coach;
      const directive = TYPE_DIRECTIVES[args.checkInType];
      const completed = data.todaysTasks.filter((t) => t.status === "completed").length;

      const prompt = `You are this user's boss, personality: ${personality}
User: ${data.displayName}. Streak: ${data.streak} days.
Today's tasks: ${completed}/${data.todaysTasks.length} done.
${data.todaysTasks.map((t) => `  • [${t.status}] ${t.title}`).join("\n")}

Write a ${args.checkInType} check-in message. ${directive}
Rules: 1-2 sentences max. Reference real task names or numbers. Stay in character. No greeting fluff.`;

      try {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5",
            system: "You generate short in-character boss check-in messages. 1-2 sentences only.",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 150,
          }),
        });
        if (resp.ok) {
          const json: any = await resp.json();
          bossMessage = json?.content?.[0]?.text?.trim() ?? "Status update. Now.";
        } else {
          bossMessage = "Check-in time. Where are we?";
        }
      } catch {
        bossMessage = "Check-in time. Where are we?";
      }
    }

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

    // Also mirror in chat thread so it shows up in Boss Chat
    await ctx.db.insert("chatMessages", {
      userId: args.userId,
      role: "boss",
      content: args.bossMessage,
      status: "sent",
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
      let type:
        | "morning"
        | "midday"
        | "afternoon"
        | "evening"
        | undefined;

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
 *
 * Frequencies (random chance per hour):
 *   off       0%
 *   light     ~11% (≈1 per 9-hour day)
 *   normal    ~22% (≈2 per day)
 *   intense   ~33% (≈3 per day)
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
