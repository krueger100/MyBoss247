import { MutationCtx } from "./_generated/server";

/**
 * Record a non-monetary "reputation" penalty when a required task is first
 * missed (goes red). Idempotent: at most one penalty per task, so the 15-min
 * warning cron never stacks duplicates (T0.3).
 *
 * No Stripe dependency — `stakeType: "reputation"`, `amount: 0`. The money tier
 * (charge/escrow) is gated for later (G1) and would build on this record.
 */
export async function recordTaskMissPenalty(
  ctx: MutationCtx,
  user: { _id: any },
  task: { _id: any }
) {
  const existing = await ctx.db
    .query("penalties")
    .withIndex("by_linkedTaskId", (q) => q.eq("linkedTaskId", task._id))
    .first();
  if (existing) return; // already penalised this task

  await ctx.db.insert("penalties", {
    userId: user._id,
    amount: 0,
    stakeType: "reputation",
    status: "active",
    triggerType: "task_missed",
    linkedTaskId: task._id,
    isActive: true,
  });
}
