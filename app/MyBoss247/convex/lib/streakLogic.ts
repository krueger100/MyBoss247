/**
 * Pure streak logic — no Convex/db access, fully unit-testable.
 *
 * Streak definition (per product spec):
 *  - A streak is consecutive SUCCESSFUL days.
 *  - A day is successful when ALL required tasks due that calendar day are
 *    completed on time.
 *  - Missing/late any required task fails the day → streak resets.
 *  - Optional tasks never affect the streak.
 *  - Days with zero required tasks are neutral (do not increment or reset, and
 *    do not break consecutiveness).
 *  - At most one increment per calendar day (idempotent).
 */

import { dueMsInTz, isOnTime } from "./dueDate";

export type DayStatus = "success" | "failed" | "neutral" | "pending";

export type StreakTask = {
  dueDate: string;
  dueTime?: string;
  status: string;
  completedAt?: number;
  required?: boolean;
};

export type StreakState = {
  currentStreak: number;
  longestStreak: number;
  lastStreakDate?: string;
};

/** A task counts toward streaks unless it is explicitly marked optional. */
export function isRequired(task: { required?: boolean }): boolean {
  return task.required !== false;
}

/**
 * Evaluate one calendar day from its REQUIRED tasks.
 *   neutral — no required tasks that day
 *   success — every required task completed on time
 *   failed  — a required task is past its deadline without an on-time
 *             completion (completed late, or still incomplete after deadline)
 *   pending — still completable: some required tasks remain but their
 *             deadlines have not passed yet
 */
export function evaluateDay(
  requiredTasks: StreakTask[],
  timeZone: string,
  nowMs: number
): DayStatus {
  if (requiredTasks.length === 0) return "neutral";

  let allOnTime = true;
  for (const t of requiredTasks) {
    const due = dueMsInTz(t.dueDate, t.dueTime, timeZone);
    const completed = t.status === "completed";
    if (completed && isOnTime(t.completedAt, due)) continue;

    allOnTime = false;
    const completedLate = completed; // completed but not on time
    const pastDeadline = due != null && nowMs > due;
    if (completedLate || pastDeadline) return "failed";
  }
  return allOnTime ? "success" : "pending";
}

/**
 * Decide the next streak state for `dayStr` given its status. Pure.
 * Returns the patch to apply, or null when nothing should change
 * (idempotent no-ops: a day already credited, neutral/pending days, or a reset
 * when already at 0).
 *
 * `bridgedFromLast` — true when this day is consecutive with the last credited
 * day, i.e. every day in between had zero required tasks (neutral). Caller
 * computes this against task data.
 */
export function decideStreakUpdate(
  state: StreakState,
  dayStr: string,
  dayStatus: DayStatus,
  bridgedFromLast: boolean
): StreakState | null {
  if (dayStatus === "success") {
    if (state.lastStreakDate === dayStr) return null; // already credited today
    const next = bridgedFromLast ? state.currentStreak + 1 : 1;
    return {
      currentStreak: next,
      longestStreak: Math.max(state.longestStreak, next),
      lastStreakDate: dayStr,
    };
  }
  if (dayStatus === "failed") {
    if (state.currentStreak === 0) return null;
    return {
      currentStreak: 0,
      longestStreak: state.longestStreak,
      lastStreakDate: state.lastStreakDate,
    };
  }
  return null; // neutral / pending → no change
}
