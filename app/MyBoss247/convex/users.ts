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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (!user) throw new Error("User not found");

    // Build patch object with only provided fields
    const patch: Record<string, unknown> = {};
    if (args.displayName !== undefined) patch.displayName = args.displayName;
    if (args.avatarUrl !== undefined) patch.avatarUrl = args.avatarUrl;
    if (args.timezone !== undefined) patch.timezone = args.timezone;
    if (args.onboardingStep !== undefined)
      patch.onboardingStep = args.onboardingStep;

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
      // Keep display name / email in sync with Clerk
      const patch: Record<string, unknown> = {};
      if (existing.email !== args.email) patch.email = args.email;
      if (existing.displayName !== args.displayName)
        patch.displayName = args.displayName;
      if (args.avatarUrl && existing.avatarUrl !== args.avatarUrl)
        patch.avatarUrl = args.avatarUrl;
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

// Generate a random 8-character invite code
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1 to avoid confusion
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
