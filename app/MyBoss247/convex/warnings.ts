import { internalMutation } from "./_generated/server";

/**
 * Recalculate warning levels for every active task. Run every 15 minutes via cron.
 *
 *   green   → on track (no due time yet, or future)
 *   yellow  → due within 4 hours, not started
 *   orange  → overdue by up to 24h
 *   red     → overdue 24h+
 */
export const recalcAllWarnings = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const tasks = await ctx.db
      .query("tasks")
      .collect();

    for (const task of tasks) {
      if (task.status === "completed" || task.status === "failed") continue;

      const dueDateMs = parseDueMs(task.dueDate, task.dueTime);
      let next: "green" | "yellow" | "orange" | "red" = "green";
      let nextStatus: typeof task.status = task.status;

      if (dueDateMs == null) {
        next = "green";
      } else {
        const diffHrs = (now - dueDateMs) / (1000 * 60 * 60);
        if (diffHrs >= 24) {
          next = "red";
          nextStatus = "overdue";
        } else if (diffHrs >= 0) {
          next = "orange";
          nextStatus = "overdue";
        } else if (diffHrs >= -4) {
          next = "yellow";
        } else {
          next = "green";
        }
      }

      if (next !== task.warningLevel || nextStatus !== task.status) {
        await ctx.db.patch(task._id, {
          warningLevel: next,
          status: nextStatus,
        });
      }
    }
  },
});

function parseDueMs(dueDate: string, dueTime?: string): number | null {
  if (!dueDate) return null;
  const time = dueTime ?? "23:59";
  const ms = Date.parse(`${dueDate}T${time}:00`);
  return isNaN(ms) ? null : ms;
}
