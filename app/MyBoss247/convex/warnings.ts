import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { dueMsInTz } from "./lib/dueDate";
import { isRequired } from "./lib/streakLogic";
import { escalationMessage } from "./lib/bossMessages";
import { recordTaskMissPenalty } from "./penalties";

const SEVERITY = { green: 0, yellow: 1, orange: 2, red: 3 } as const;

/**
 * Recalculate warning levels for every active task. Run every 15 minutes via cron.
 *
 *   green   → on track (no due time yet, or future)
 *   yellow  → due within 4 hours, not started
 *   orange  → overdue by up to 24h
 *   red     → overdue 24h+
 *
 * Deadlines are interpreted in each task owner's timezone (T0.1). On the
 * transition into orange/red the Boss speaks in-character + pushes (T0.4), and
 * the first time a required task goes red a (non-money) penalty is recorded
 * (T0.3). Both fire only on the level *change*, so they never repeat.
 */
export const recalcAllWarnings = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const tasks = await ctx.db.query("tasks").collect();

    // Resolve each owner once (need timezone + boss personality).
    const userCache = new Map<string, any>();
    const userFor = async (userId: any) => {
      const key = String(userId);
      if (userCache.has(key)) return userCache.get(key);
      const u = await ctx.db.get(userId);
      userCache.set(key, u);
      return u;
    };

    for (const task of tasks) {
      if (task.status === "completed" || task.status === "failed") continue;

      const user = await userFor(task.userId);
      const tz = user?.timezone || "UTC";
      const dueDateMs = dueMsInTz(task.dueDate, task.dueTime, tz);

      let next: "green" | "yellow" | "orange" | "red" = "green";
      let nextStatus: typeof task.status = task.status;
      if (dueDateMs != null) {
        const diffHrs = (now - dueDateMs) / (1000 * 60 * 60);
        if (diffHrs >= 24) {
          next = "red";
          nextStatus = "overdue";
        } else if (diffHrs >= 0) {
          next = "orange";
          nextStatus = "overdue";
        } else if (diffHrs >= -4) {
          next = "yellow";
        }
      }

      const prev = task.warningLevel;
      if (next === prev && nextStatus === task.status) continue; // nothing changed

      // Side-effects fire only for required tasks, on the upward transition.
      if (user && isRequired(task)) {
        const escalatedIntoOrangeRed =
          SEVERITY[next] > SEVERITY[prev] && SEVERITY[next] >= SEVERITY.orange;

        if (escalatedIntoOrangeRed) {
          // T0.4 — Boss speaks in-character + push, reusing the check-in pattern.
          await ctx.scheduler.runAfter(0, internal.checkIns._insertCheckIn, {
            userId: user._id,
            bossMessage: escalationMessage(
              user.bossSettings?.personality ?? "tough_coach",
              next as "orange" | "red",
              task.title
            ),
            checkInType: "warning" as const,
          });
        }

        // T0.3 — record a non-money penalty the first time it goes red.
        if (next === "red" && prev !== "red") {
          await recordTaskMissPenalty(ctx, user, task);
        }
      }

      await ctx.db.patch(task._id, {
        warningLevel: next,
        status: nextStatus,
      });
    }
  },
});
