/**
 * Deterministic, timezone-aware due-date math for tasks.
 *
 * Tasks store `dueDate` as a calendar string "YYYY-MM-DD" and an optional
 * `dueTime` "HH:MM". A deadline is the END of that wall-clock minute in the
 * USER's timezone. Everything is compared as absolute UTC epoch milliseconds,
 * so an on-time check yields the same answer regardless of where the server or
 * client runs (Android / iOS / Web).
 *
 * Pure functions only — no Convex/db access — so they are unit-testable.
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{1,2}):(\d{2})$/;

/** Parse "YYYY-MM-DD" → {year,month,day} (month 1-12), or null if malformed. */
export function parseDateParts(dueDate: string | undefined | null) {
  if (!dueDate) return null;
  const m = DATE_RE.exec(dueDate.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/** Parse "HH:MM" → {hour,minute}; defaults to end-of-day 23:59 when absent/malformed. */
export function parseTimeParts(dueTime: string | undefined | null) {
  if (!dueTime) return { hour: 23, minute: 59 };
  const m = TIME_RE.exec(dueTime.trim());
  if (!m) return { hour: 23, minute: 59 };
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return { hour: 23, minute: 59 };
  return { hour, minute };
}

/**
 * Offset (ms) of `timeZone` from UTC at a given absolute instant.
 * Uses Intl; falls back to 0 (UTC) if the runtime lacks timezone data.
 */
function tzOffsetMsAt(utcMs: number, timeZone: string): number {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = dtf.formatToParts(new Date(utcMs));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const asIfUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second")
    );
    // Compare at second precision: utcMs may carry milliseconds (e.g. the
    // 23:59:59.999 deadline) that formatToParts truncates, and zone offsets are
    // whole minutes — so drop sub-second noise to avoid a spurious offset.
    return asIfUtc - Math.floor(utcMs / 1000) * 1000;
  } catch {
    return 0;
  }
}

/**
 * Convert a wall-clock date/time in `timeZone` to a UTC epoch (ms).
 * Returns null when the date is missing/malformed → treated as "no deadline".
 * Inclusive of the final minute (…:59.999) so a task due "23:59" counts the
 * whole closing minute as on time.
 */
export function dueMsInTz(
  dueDate: string | undefined | null,
  dueTime: string | undefined | null,
  timeZone: string | undefined | null
): number | null {
  const d = parseDateParts(dueDate);
  if (!d) return null;
  const t = parseTimeParts(dueTime);
  const tz = timeZone || "UTC";
  // Treat the wall clock as if it were UTC, then correct by the zone's offset.
  // Re-check the offset once at the corrected instant to settle DST boundaries.
  const guess = Date.UTC(d.year, d.month - 1, d.day, t.hour, t.minute, 59, 999);
  const offset = tzOffsetMsAt(guess, tz);
  let utc = guess - offset;
  const offset2 = tzOffsetMsAt(utc, tz);
  if (offset2 !== offset) utc = guess - offset2;
  return utc;
}

/** True when completed on or before the deadline. No deadline → never late. */
export function isOnTime(
  completedAtMs: number | null | undefined,
  dueMs: number | null
): boolean {
  if (completedAtMs == null) return false; // not completed → not on time
  if (dueMs == null) return true; // missing/malformed due date → never late
  return completedAtMs <= dueMs;
}

/** Local calendar day ("YYYY-MM-DD") of an instant in the given timezone. */
export function localDateInTz(
  ms: number,
  timeZone: string | undefined | null
): string {
  const tz = timeZone || "UTC";
  try {
    const dtf = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = dtf.formatToParts(new Date(ms));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return new Date(ms).toISOString().slice(0, 10);
  }
}

/** Add `n` days to a "YYYY-MM-DD" string (calendar math, timezone-independent). */
export function addDays(dateStr: string, n: number): string {
  const d = parseDateParts(dateStr);
  if (!d) return dateStr;
  const ms = Date.UTC(d.year, d.month - 1, d.day) + n * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}
