import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Get the current authenticated user from Convex.
 * Uses the Clerk token identity to look up the user record.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    return user;
  },
});

/**
 * Create a new user record after Clerk sign-up.
 * Called once when a user first authenticates.
 */
export const createUser = mutation({
  args: {
    email: v.string(),
    displayName: v.string(),
    timezone: v.string(),
    bossPersonality: v.union(
      v.literal("drill_sergeant"),
      v.literal("tough_coach"),
      v.literal("supportive_manager")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    // Generate a unique invite code
    const inviteCode = generateInviteCode();

    // Create new user with defaults
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: args.email,
      displayName: args.displayName,
      timezone: args.timezone,
      inviteCode,
      bossSettings: {
        personality: args.bossPersonality,
        checkinTimes: {
          morning: "08:00",
          midday: "12:00",
          afternoon: "15:00",
          evening: "18:00",
        },
        inboxFrequency: "normal",
        workingHoursStart: "09:00",
        workingHoursEnd: "18:00",
      },
      personalDaysRemaining: 2,
      personalDaysPerMonth: 2,
      subscriptionTier: "trial",
      subscriptionStatus: "active",
      trialEndsAt: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days from now
      currentStreak: 0,
      longestStreak: 0,
      onboardingStep: "quick_start",
    });

    return userId;
  },
});

/**
 * Update user profile fields.
 */
export const updateUser = mutation({
  args: {
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    timezone: v.optional(v.string()),
    onboardingStep: v.optional(v.string()),
    bossPersonality: v.optional(
      v.union(
        v.literal("drill_sergeant"),
        v.literal("tough_coach"),
        v.literal("supportive_manager")
      )
    ),
    checkinTimes: v.optional(
      v.object({
        morning: v.string(),
        midday: v.string(),
        afternoon: v.string(),
        evening: v.string(),
      })
    ),
    inboxFrequency: v.optional(
      v.union(
        v.literal("off"),
        v.literal("light"),
        v.literal("normal"),
        v.literal("intense")
      )
    ),
    workingHoursStart: v.optional(v.string()),
    workingHoursEnd: v.optional(v.string()),
    personalDaysPerMonth: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const patch: Record<string, unknown> = {};
    if (args.displayName !== undefined) patch.displayName = args.displayName;
    if (args.avatarUrl !== undefined) patch.avatarUrl = args.avatarUrl;
    if (args.timezone !== undefined) patch.timezone = args.timezone;
    if (args.onboardingStep !== undefined)
      patch.onboardingStep = args.onboardingStep;
    if (args.personalDaysPerMonth !== undefined)
      patch.personalDaysPerMonth = args.personalDaysPerMonth;

    // Boss settings updates — merge into existing object
    const settingsChanged =
      args.bossPersonality !== undefined ||
      args.checkinTimes !== undefined ||
      args.inboxFrequency !== undefined ||
      args.workingHoursStart !== undefined ||
      args.workingHoursEnd !== undefined;
    if (settingsChanged) {
      patch.bossSettings = {
        ...user.bossSettings,
        ...(args.bossPersonality !== undefined && {
          personality: args.bossPersonality,
        }),
        ...(args.checkinTimes !== undefined && {
          checkinTimes: args.checkinTimes,
        }),
        ...(args.inboxFrequency !== undefined && {
          inboxFrequency: args.inboxFrequency,
        }),
        ...(args.workingHoursStart !== undefined && {
          workingHoursStart: args.workingHoursStart,
        }),
        ...(args.workingHoursEnd !== undefined && {
          workingHoursEnd: args.workingHoursEnd,
        }),
      };
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(user._id, patch);
    }

    return user._id;
  },
});

/**
 * Sync a Clerk user into Convex. Creates a new user row on first sign-in
 * with safe defaults. Called every time the app loads for an authenticated user.
 * Returns the user document.
 */
export const syncUser = mutation({
  args: {
    email: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (existing) {
      // Keep display name / email in sync with Clerk.
      // Only touch avatarUrl if the user has NOT uploaded one through us
      // (i.e. they have no avatarStorageId — meaning the existing url came
      // from Clerk anyway, not from our storage).
      const patch: Record<string, unknown> = {};
      if (existing.email !== args.email) patch.email = args.email;
      if (existing.displayName !== args.displayName)
        patch.displayName = args.displayName;

      const hasUserUploadedAvatar = !!(existing as any).avatarStorageId;
      if (!hasUserUploadedAvatar) {
        if (args.avatarUrl && existing.avatarUrl !== args.avatarUrl) {
          patch.avatarUrl = args.avatarUrl;
        } else if (!args.avatarUrl && existing.avatarUrl) {
          // Clerk default was previously synced — clear it
          patch.avatarUrl = undefined;
        }
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch);
      }
      return existing._id;
    }

    const inviteCode = generateInviteCode();

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: args.email,
      displayName: args.displayName,
      avatarUrl: args.avatarUrl,
      timezone: args.timezone ?? "UTC",
      inviteCode,
      bossSettings: {
        personality: "tough_coach",
        checkinTimes: {
          morning: "08:00",
          midday: "12:00",
          afternoon: "15:00",
          evening: "18:00",
        },
        inboxFrequency: "normal",
        workingHoursStart: "09:00",
        workingHoursEnd: "18:00",
      },
      personalDaysRemaining: 2,
      personalDaysPerMonth: 2,
      subscriptionTier: "trial",
      subscriptionStatus: "active",
      trialEndsAt: Date.now() + 3 * 24 * 60 * 60 * 1000,
      currentStreak: 0,
      longestStreak: 0,
      onboardingStep: "quick_start",
    });

    return userId;
  },
});

/**
 * Sign the Employment Contract. Persists timestamp on the user.
 */
export const signContract = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    if (user.contractSignedAt) {
      return user.contractSignedAt; // idempotent
    }

    const now = Date.now();
    await ctx.db.patch(user._id, { contractSignedAt: now });

    return now;
  },
});

/**
 * Count completed tasks for the current user. Used to detect when the
 * progressive onboarding contract prompt should fire (after task #3).
 */
export const completedTaskCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return 0;

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", user._id).eq("status", "completed")
      )
      .collect();
    return tasks.length;
  },
});

/**
 * Invoke a personal day for today. Decrements personalDaysRemaining
 * and logs to personalDaysLog. Idempotent — can't invoke twice on same day.
 */
export const invokePersonalDay = mutation({
  args: { reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    if (user.personalDaysRemaining <= 0) {
      throw new Error("No personal days remaining this month.");
    }

    // Already invoked today?
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const existing = await ctx.db
      .query("personalDaysLog")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("dateUsed"), todayStr))
      .first();
    if (existing) {
      throw new Error("Personal day already invoked for today.");
    }

    await ctx.db.insert("personalDaysLog", {
      userId: user._id,
      dateUsed: todayStr,
      reason: args.reason,
      streakProtected: user.currentStreak,
    });

    await ctx.db.patch(user._id, {
      personalDaysRemaining: user.personalDaysRemaining - 1,
    });

    return { remaining: user.personalDaysRemaining - 1 };
  },
});

// Generate a random 8-character invite code
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1 to avoid confusion
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
