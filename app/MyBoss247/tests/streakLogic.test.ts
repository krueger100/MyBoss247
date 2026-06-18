import { describe, it, expect } from "vitest";
import {
  isRequired,
  evaluateDay,
  decideStreakUpdate,
  StreakTask,
} from "../convex/lib/streakLogic";

const DAY = "2026-06-18";
const TZ = "UTC";
const due = Date.UTC(2026, 5, 18, 23, 59, 59, 999);
const before = Date.UTC(2026, 5, 18, 10, 0, 0); // on time
const after = Date.UTC(2026, 5, 19, 10, 0, 0); // late / past deadline

const task = (over: Partial<StreakTask> = {}): StreakTask => ({
  dueDate: DAY,
  dueTime: "23:59",
  status: "pending",
  required: true,
  ...over,
});

describe("isRequired", () => {
  it("treats absent/true as required, false as optional", () => {
    expect(isRequired({})).toBe(true);
    expect(isRequired({ required: true })).toBe(true);
    expect(isRequired({ required: false })).toBe(false);
  });
});

describe("evaluateDay", () => {
  it("neutral when there are no required tasks", () => {
    expect(evaluateDay([], TZ, after)).toBe("neutral");
  });
  it("success when every required task is completed on time (Scenario 1)", () => {
    const day = [
      task({ status: "completed", completedAt: before }),
      task({ status: "completed", completedAt: before }),
    ];
    expect(evaluateDay(day, TZ, after)).toBe("success");
  });
  it("failed when a required task is completed late (Scenario 2)", () => {
    const day = [task({ status: "completed", completedAt: after })];
    expect(evaluateDay(day, TZ, after)).toBe("failed");
  });
  it("failed when a required task is still incomplete after the deadline", () => {
    const day = [task({ status: "pending" })];
    expect(evaluateDay(day, TZ, after)).toBe("failed");
  });
  it("pending when a required task is incomplete but the deadline hasn't passed", () => {
    const now = Date.UTC(2026, 5, 18, 12, 0, 0); // before `due`
    const day = [task({ status: "pending" })];
    expect(evaluateDay(day, TZ, now)).toBe("pending");
  });
  it("a single late required task fails the whole day", () => {
    const day = [
      task({ status: "completed", completedAt: before }),
      task({ status: "completed", completedAt: after }),
    ];
    expect(evaluateDay(day, TZ, after)).toBe("failed");
  });
  it("ignores optional tasks (they are filtered out before evaluation)", () => {
    // evaluateDay receives only required tasks; an all-optional day is empty → neutral
    expect(evaluateDay([], TZ, after)).toBe("neutral");
  });
});

describe("decideStreakUpdate", () => {
  it("increments on a fresh successful day (Scenario 1)", () => {
    const next = decideStreakUpdate(
      { currentStreak: 4, longestStreak: 4, lastStreakDate: "2026-06-17" },
      DAY,
      "success",
      true
    );
    expect(next).toEqual({
      currentStreak: 5,
      longestStreak: 5,
      lastStreakDate: DAY,
    });
  });
  it("is idempotent — never double-counts the same day (Scenario 4)", () => {
    const next = decideStreakUpdate(
      { currentStreak: 5, longestStreak: 5, lastStreakDate: DAY },
      DAY,
      "success",
      true
    );
    expect(next).toBeNull();
  });
  it("restarts at 1 when the streak was not bridged (gap with a failed day)", () => {
    const next = decideStreakUpdate(
      { currentStreak: 9, longestStreak: 9, lastStreakDate: "2026-06-10" },
      DAY,
      "success",
      false
    );
    expect(next).toEqual({
      currentStreak: 1,
      longestStreak: 9,
      lastStreakDate: DAY,
    });
  });
  it("preserves the longest streak as a running max (Scenario 3 — unlock path)", () => {
    // current 6 → 7 crosses the 7-day achievement threshold via longestStreak
    const next = decideStreakUpdate(
      { currentStreak: 6, longestStreak: 6, lastStreakDate: "2026-06-17" },
      DAY,
      "success",
      true
    );
    expect(next?.currentStreak).toBe(7);
    expect(next?.longestStreak).toBe(7);
  });
  it("resets to 0 on a failed day (Scenario 2)", () => {
    const next = decideStreakUpdate(
      { currentStreak: 8, longestStreak: 12, lastStreakDate: "2026-06-17" },
      DAY,
      "failed",
      false
    );
    expect(next).toEqual({
      currentStreak: 0,
      longestStreak: 12,
      lastStreakDate: "2026-06-17",
    });
  });
  it("is idempotent on reset — no change when already 0", () => {
    expect(
      decideStreakUpdate({ currentStreak: 0, longestStreak: 3 }, DAY, "failed", false)
    ).toBeNull();
  });
  it("does nothing on neutral or pending days", () => {
    const state = { currentStreak: 3, longestStreak: 3, lastStreakDate: "2026-06-17" };
    expect(decideStreakUpdate(state, DAY, "neutral", true)).toBeNull();
    expect(decideStreakUpdate(state, DAY, "pending", true)).toBeNull();
  });
});
