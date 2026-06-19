/**
 * Pure task-notification logic — no Convex/db access, unit-testable.
 *
 * This is the channel-agnostic core: it turns a user's tasks into notification
 * items. The in-app bell consumes it today; a future push or email dispatcher
 * can call the exact same function and render the items to its own channel.
 *
 * Rules:
 *   overdue  = deadline has passed and the task isn't completed/failed
 *   upcoming = deadline is within `windowMs` from now (configurable threshold)
 */
import { dueMsInTz } from "./dueDate";

export type NotificationType = "overdue" | "upcoming";

export type TaskLike = {
  taskId: string;
  title: string;
  dueDate: string;
  dueTime?: string | null;
  status: string;
  [extra: string]: any;
};

export type NotificationItem = TaskLike & {
  type: NotificationType;
  dueMs: number;
  hoursOverdue?: number;
  hoursUntilDue?: number;
};

export type NotificationResult = {
  overdue: NotificationItem[];
  upcoming: NotificationItem[];
  total: number;
};

export function computeTaskNotifications(
  tasks: TaskLike[],
  timeZone: string,
  nowMs: number,
  windowMs: number
): NotificationResult {
  const overdue: NotificationItem[] = [];
  const upcoming: NotificationItem[] = [];

  for (const t of tasks) {
    if (t.status === "completed" || t.status === "failed") continue;
    const dueMs = dueMsInTz(t.dueDate, t.dueTime ?? undefined, timeZone);
    if (dueMs == null) continue; // no deadline → nothing to notify about

    if (dueMs < nowMs) {
      overdue.push({
        ...t,
        type: "overdue",
        dueMs,
        hoursOverdue: Math.floor((nowMs - dueMs) / 3_600_000),
      });
    } else if (dueMs <= nowMs + windowMs) {
      upcoming.push({
        ...t,
        type: "upcoming",
        dueMs,
        hoursUntilDue: Math.ceil((dueMs - nowMs) / 3_600_000),
      });
    }
  }

  overdue.sort((a, b) => a.dueMs - b.dueMs); // most overdue first
  upcoming.sort((a, b) => a.dueMs - b.dueMs); // soonest first
  return { overdue, upcoming, total: overdue.length + upcoming.length };
}
