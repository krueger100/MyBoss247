import { internalMutation, MutationCtx } from "./_generated/server";
import { addDays, localDateInTz } from "./lib/dueDate";
import {
  decideStreakUpdate,
  evaluateDay,
  isRequired,
  StreakState,
} from "./lib/streakLogic";

type UserDoc = {
  _id: any;
  timezone?: string;
  currentStreak: number;
  longestStreak: number;
  lastStreakDate?: string;
};

/** Required tasks due on a given local calendar day for a user. */
async function requiredTasksForDay(
  ctx: MutationCtx,
  userId: any,
  dayStr: string
) {
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_userId_dueDate", (q) =>
      q.eq("userId", userId).eq("dueDate", dayStr)
    )
    .collect();
  return tasks.filter(isRequired);
}

/**
 * Is `dayStr` consecutive with the user's last credited streak day? True only
 * when every day strictly between them had zero required tasks (neutral days
 * don't break a streak). False when there's no prior day or a non-neutral gap.
 */
async function isBridgedByNeutralDays(
  ctx: MutationCtx,
  user: UserDoc,
  dayStr: string,
  nowMs: number
): Promise<boolean> {
  const last = user.lastStreakDate;
  if (!last || last >= dayStr) return false;
  const tz = user.timezone || "UTC";
  let cursor = addDays(last, 1);
  let guard = 0;
  while (cursor < dayStr && guard < 400) {
    const required = await requiredTasksForDay(ctx, user._id, cursor);
    if (evaluateDay(required, tz, nowMs) !== "neutral") return false;
    cursor = addDays(cursor, 1);
    guard++;
  }
  return true;
}

/**
 * Recompute the streak after a required task on `dayStr` (the task's due date)
 * changes. Idempotent: a day is credited at most once via `lastStreakDate`,
 * so repeated completions / refreshes / cron runs never double-count.
 */
export async function updateStreakForDay(
  ctx: MutationCtx,
  user: UserDoc,
  dayStr: string,
  nowMs: number
) {
  const tz = user.timezone || "UTC";
  const required = await requiredTasksForDay(ctx, user._id, dayStr);
  const status = evaluateDay(required, tz, nowMs);

  const bridged =
    status === "success"
      ? await isBridgedByNeutralDays(ctx, user, dayStr, nowMs)
      : false;

  const next: StreakState | null = decideStreakUpdate(
    {
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      lastStreakDate: user.lastStreakDate,
    },
    dayStr,
    status,
    bridged
  );

  if (next) await ctx.db.patch(user._id, next);
}

/**
 * Daily cron: reset the streak for any user whose most-recent fully-elapsed day
 * (their local "yesterday") failed — i.e. a required task there was missed and
 * never completed on time. Catches abandoned days that fire no completion event.
 * Idempotent (only ever sets the streak to 0).
 */
export const resetBrokenStreaks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      if (user.currentStreak === 0) continue;
      const tz = user.timezone || "UTC";
      const yesterday = addDays(localDateInTz(now, tz), -1);
      const required = await requiredTasksForDay(ctx, user._id, yesterday);
      if (evaluateDay(required, tz, now) === "failed") {
        await ctx.db.patch(user._id, { currentStreak: 0 });
      }
    }
  },
});
