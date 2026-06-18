import { describe, it, expect } from "vitest";
import {
  parseDateParts,
  parseTimeParts,
  dueMsInTz,
  isOnTime,
  localDateInTz,
  addDays,
} from "../convex/lib/dueDate";

describe("parseDateParts", () => {
  it("parses a valid date", () => {
    expect(parseDateParts("2026-06-18")).toEqual({ year: 2026, month: 6, day: 18 });
  });
  it("rejects malformed / out-of-range / empty dates", () => {
    expect(parseDateParts("nonsense")).toBeNull();
    expect(parseDateParts("2026-13-40")).toBeNull();
    expect(parseDateParts("")).toBeNull();
    expect(parseDateParts(undefined)).toBeNull();
  });
});

describe("parseTimeParts", () => {
  it("defaults to end-of-day when missing or malformed", () => {
    expect(parseTimeParts(undefined)).toEqual({ hour: 23, minute: 59 });
    expect(parseTimeParts("99:99")).toEqual({ hour: 23, minute: 59 });
  });
  it("parses a valid time", () => {
    expect(parseTimeParts("08:30")).toEqual({ hour: 8, minute: 30 });
  });
});

describe("dueMsInTz", () => {
  it("interprets the deadline in the given timezone (inclusive of the final minute)", () => {
    // UTC: wall clock == UTC instant
    expect(dueMsInTz("2026-06-18", "23:59", "UTC")).toBe(
      Date.UTC(2026, 5, 18, 23, 59, 59, 999)
    );
    // New York in June = EDT (UTC-4) → 23:59 local is 03:59 next-day UTC
    expect(dueMsInTz("2026-06-18", "23:59", "America/New_York")).toBe(
      Date.UTC(2026, 5, 19, 3, 59, 59, 999)
    );
    // Los Angeles in June = PDT (UTC-7) → 06:59 next-day UTC
    expect(dueMsInTz("2026-06-18", "23:59", "America/Los_Angeles")).toBe(
      Date.UTC(2026, 5, 19, 6, 59, 59, 999)
    );
  });
  it("returns null for missing/malformed dates (→ no deadline)", () => {
    expect(dueMsInTz("", "23:59", "UTC")).toBeNull();
    expect(dueMsInTz("2026-13-01", "23:59", "UTC")).toBeNull();
  });
});

describe("isOnTime", () => {
  const due = Date.UTC(2026, 5, 18, 23, 59, 59, 999);
  it("is true when completed on or before the deadline", () => {
    expect(isOnTime(Date.UTC(2026, 5, 18, 10, 0, 0), due)).toBe(true);
    expect(isOnTime(due, due)).toBe(true);
  });
  it("is false when completed after the deadline", () => {
    expect(isOnTime(Date.UTC(2026, 5, 19, 10, 0, 0), due)).toBe(false);
  });
  it("treats a missing deadline as never late", () => {
    expect(isOnTime(Date.UTC(2026, 5, 19, 10, 0, 0), null)).toBe(true);
  });
  it("is false when not completed", () => {
    expect(isOnTime(null, due)).toBe(false);
    expect(isOnTime(undefined, due)).toBe(false);
  });
  it("timezone edge: on time in user's tz even though it looks late in UTC", () => {
    // Due end of 2026-06-18 in LA (PDT). A completion at 2026-06-19T05:00Z is
    // 2026-06-18 22:00 PDT — on time — but would look late under naive UTC parsing.
    const dueLA = dueMsInTz("2026-06-18", "23:59", "America/Los_Angeles")!;
    const completedAt = Date.UTC(2026, 5, 19, 5, 0, 0);
    expect(isOnTime(completedAt, dueLA)).toBe(true);
    // Same instant against a naive UTC end-of-day would be late:
    expect(isOnTime(completedAt, dueMsInTz("2026-06-18", "23:59", "UTC")!)).toBe(false);
  });
});

describe("localDateInTz", () => {
  it("returns the local calendar day for the instant", () => {
    const ms = Date.UTC(2026, 5, 19, 5, 0, 0); // 2026-06-19 05:00 UTC
    expect(localDateInTz(ms, "UTC")).toBe("2026-06-19");
    expect(localDateInTz(ms, "America/Los_Angeles")).toBe("2026-06-18"); // 22:00 prev day
  });
});

describe("addDays", () => {
  it("does calendar math across month boundaries", () => {
    expect(addDays("2026-06-18", 1)).toBe("2026-06-19");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28"); // 2026 is not a leap year
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
