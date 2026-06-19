import { describe, it, expect } from "vitest";
import { computeTaskNotifications } from "../convex/lib/notifications";

const TZ = "UTC";
const now = Date.UTC(2026, 5, 18, 12, 0, 0); // 2026-06-18 12:00 UTC
const WINDOW = 48 * 3_600_000;

let n = 0;
const task = (over: any = {}) => ({
  taskId: "t" + n++,
  title: "T",
  dueDate: "2026-06-18",
  dueTime: "23:59",
  status: "pending",
  ...over,
});

describe("computeTaskNotifications", () => {
  it("flags overdue tasks (past deadline, not completed)", () => {
    const r = computeTaskNotifications([task({ dueDate: "2026-06-16" })], TZ, now, WINDOW);
    expect(r.overdue.length).toBe(1);
    expect(r.upcoming.length).toBe(0);
    expect(r.overdue[0].type).toBe("overdue");
    expect(r.overdue[0].hoursOverdue).toBeGreaterThan(0);
  });

  it("flags upcoming tasks within the window", () => {
    const r = computeTaskNotifications([task({ dueDate: "2026-06-18" })], TZ, now, WINDOW); // ~12h out
    expect(r.upcoming.length).toBe(1);
    expect(r.upcoming[0].type).toBe("upcoming");
  });

  it("excludes tasks beyond the upcoming window", () => {
    const r = computeTaskNotifications([task({ dueDate: "2026-06-25" })], TZ, now, WINDOW); // a week out
    expect(r.total).toBe(0);
  });

  it("excludes completed and failed tasks", () => {
    const r = computeTaskNotifications(
      [
        task({ dueDate: "2026-06-16", status: "completed" }),
        task({ dueDate: "2026-06-16", status: "failed" }),
      ],
      TZ,
      now,
      WINDOW
    );
    expect(r.total).toBe(0);
  });

  it("ignores tasks with no due date", () => {
    expect(computeTaskNotifications([task({ dueDate: "" })], TZ, now, WINDOW).total).toBe(0);
  });

  it("respects a custom (configurable) window", () => {
    // due ~12h out; a 6h window should exclude it, a 48h window includes it
    const sixHrs = computeTaskNotifications([task({ dueDate: "2026-06-18" })], TZ, now, 6 * 3_600_000);
    expect(sixHrs.total).toBe(0);
  });

  it("sorts overdue most-overdue-first and upcoming soonest-first", () => {
    const r = computeTaskNotifications(
      [
        task({ taskId: "a", dueDate: "2026-06-17", dueTime: "23:59" }), // ~12h overdue
        task({ taskId: "b", dueDate: "2026-06-15", dueTime: "23:59" }), // ~2.5d overdue
        task({ taskId: "c", dueDate: "2026-06-18", dueTime: "20:00" }), // ~8h upcoming
        task({ taskId: "d", dueDate: "2026-06-19", dueTime: "06:00" }), // ~18h upcoming
      ],
      TZ,
      now,
      WINDOW
    );
    expect(r.overdue.map((o) => o.taskId)).toEqual(["b", "a"]);
    expect(r.upcoming.map((u) => u.taskId)).toEqual(["c", "d"]);
    expect(r.total).toBe(4);
  });
});
