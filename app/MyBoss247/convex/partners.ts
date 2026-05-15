import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Look up a user by their invite code.
 */
export const findByInviteCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const target = await ctx.db
      .query("users")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.code.toUpperCase().trim()))
      .first();
    if (!target) return null;

    // Don't return your own self-match
    const me = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (me && me._id === target._id) return null;

    return {
      _id: target._id,
      displayName: target.displayName,
      avatarUrl: target.avatarUrl,
      currentStreak: target.currentStreak,
      inviteCode: target.inviteCode,
    };
  },
});

/**
 * Send a partnership invite to another user. Status starts as "pending".
 */
export const sendInvite = mutation({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const me = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!me) throw new Error("User not found");
    if (me._id === args.targetUserId) throw new Error("Can't partner with yourself");

    // Already a partnership?
    const existingA = await ctx.db
      .query("partnerships")
      .withIndex("by_partnerAId", (q) => q.eq("partnerAId", me._id))
      .collect();
    const existingB = await ctx.db
      .query("partnerships")
      .withIndex("by_partnerBId", (q) => q.eq("partnerBId", me._id))
      .collect();
    const all = [...existingA, ...existingB];
    const dupe = all.find(
      (p) =>
        (p.partnerAId === me._id && p.partnerBId === args.targetUserId) ||
        (p.partnerBId === me._id && p.partnerAId === args.targetUserId)
    );
    if (dupe) {
      if (dupe.status === "active") throw new Error("Already partners");
      if (dupe.status === "pending") throw new Error("Invite already sent");
    }

    return await ctx.db.insert("partnerships", {
      partnerAId: me._id,
      partnerBId: args.targetUserId,
      status: "pending",
    });
  },
});

/**
 * Accept a partnership invite.
 */
export const acceptInvite = mutation({
  args: { partnershipId: v.id("partnerships") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const me = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!me) throw new Error("User not found");

    const partnership = await ctx.db.get(args.partnershipId);
    if (!partnership || partnership.partnerBId !== me._id) {
      throw new Error("Invite not found");
    }
    if (partnership.status !== "pending") {
      throw new Error("Already responded");
    }

    await ctx.db.patch(args.partnershipId, { status: "active" });
  },
});

/**
 * Decline or end a partnership.
 */
export const removePartnership = mutation({
  args: { partnershipId: v.id("partnerships") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const me = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!me) throw new Error("User not found");

    const p = await ctx.db.get(args.partnershipId);
    if (!p) throw new Error("Not found");
    if (p.partnerAId !== me._id && p.partnerBId !== me._id) {
      throw new Error("Not your partnership");
    }
    await ctx.db.patch(args.partnershipId, { status: "ended" });
  },
});

/**
 * List partnerships involving me. Returns the *other* user's info, plus
 * partnership status and direction.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const me = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!me) return [];

    const asA = await ctx.db
      .query("partnerships")
      .withIndex("by_partnerAId", (q) => q.eq("partnerAId", me._id))
      .collect();
    const asB = await ctx.db
      .query("partnerships")
      .withIndex("by_partnerBId", (q) => q.eq("partnerBId", me._id))
      .collect();

    const all = [...asA, ...asB].filter((p) => p.status !== "ended");

    return await Promise.all(
      all.map(async (p) => {
        const otherId = p.partnerAId === me._id ? p.partnerBId : p.partnerAId;
        const other = await ctx.db.get(otherId);
        const isOutgoing = p.partnerAId === me._id;
        return {
          partnershipId: p._id,
          status: p.status,
          isOutgoingInvite: p.status === "pending" && isOutgoing,
          isIncomingInvite: p.status === "pending" && !isOutgoing,
          other: other
            ? {
                _id: other._id,
                displayName: other.displayName,
                avatarUrl: other.avatarUrl,
                currentStreak: other.currentStreak,
                longestStreak: other.longestStreak,
                inviteCode: other.inviteCode,
              }
            : null,
        };
      })
    );
  },
});

/**
 * Partner stats — completion rate, recent task counts.
 */
export const partnerStats = query({
  args: { partnerUserId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const me = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!me) return null;

    // Verify we're actually partners
    const partnerships = await ctx.db
      .query("partnerships")
      .withIndex("by_partnerAId", (q) => q.eq("partnerAId", me._id))
      .collect();
    const partnerships2 = await ctx.db
      .query("partnerships")
      .withIndex("by_partnerBId", (q) => q.eq("partnerBId", me._id))
      .collect();
    const active = [...partnerships, ...partnerships2].find(
      (p) =>
        p.status === "active" &&
        (p.partnerAId === args.partnerUserId || p.partnerBId === args.partnerUserId)
    );
    if (!active) return null;

    const partner = await ctx.db.get(args.partnerUserId);
    if (!partner) return null;

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId", (q) => q.eq("userId", args.partnerUserId))
      .collect();
    const completed = tasks.filter((t) => t.status === "completed").length;
    const overdue = tasks.filter((t) => t.status === "overdue").length;
    const completionRate =
      tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

    return {
      _id: partner._id,
      displayName: partner.displayName,
      avatarUrl: partner.avatarUrl,
      currentStreak: partner.currentStreak,
      longestStreak: partner.longestStreak,
      tasksCompleted: completed,
      tasksTotal: tasks.length,
      tasksOverdue: overdue,
      completionRate,
    };
  },
});
