import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check user check-in schedules every 15 min; fire if within window.
crons.interval(
  "scheduled check-ins",
  { minutes: 15 },
  internal.checkIns._runScheduledCheckIns
);

// Recalculate task warning levels every 15 min.
crons.interval(
  "warning escalation",
  { minutes: 15 },
  internal.warnings.recalcAllWarnings
);

// Boss Inbox — random unscheduled messages, fires hourly during working hours.
crons.interval(
  "boss inbox",
  { hours: 1 },
  internal.checkIns._runBossInbox
);

// Weekly performance review — Sunday 19:00 UTC.
crons.weekly(
  "weekly performance review",
  { dayOfWeek: "sunday", hourUTC: 19, minuteUTC: 0 },
  internal.reviews._runWeeklyReviews
);

// Reset streaks broken by a missed required task — runs daily.
crons.daily(
  "reset broken streaks",
  { hourUTC: 8, minuteUTC: 0 },
  internal.streaks.resetBrokenStreaks
);

export default crons;
