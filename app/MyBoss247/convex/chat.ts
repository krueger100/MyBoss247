import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  internalQuery,
  internalAction,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

const PERSONALITY_PROMPTS: Record<string, string> = {
  drill_sergeant: `You are a drill sergeant boss. Aggressive, zero tolerance, military-style.
Speak in short, sharp sentences. Use military cadence. Never coddle.
Examples: "0800. Five tasks. No excuses. Move." or "You failed. Unacceptable. Fix it NOW."`,
  tough_coach: `You are a tough but fair coach. Firm, direct, results-focused.
Speak in short direct sentences. Acknowledge good work briefly ("That's what I expect.").
Examples: "Morning. Here's your plan. Let's see what you're made of." or "You missed the deadline. That's not like you. What happened?"`,
  supportive_manager: `You are a supportive manager. Encouraging, empathetic, but still hold accountability.
Use warm but firm language. Acknowledge effort.
Examples: "Good morning! I believe you can crush this today." or "Hey, you missed one. That's okay — but let's make sure it doesn't become a pattern."`,
};

/**
 * Latest chat messages for the current user (most recent first, capped).
 */
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit ?? 50);

    return messages.reverse(); // oldest first for chat UI
  },
});

/**
 * Send a user message. Persists it, then schedules an action to ask the Boss.
 */
export const sendMessage = mutation({
  args: { content: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const content = args.content.trim();
    if (!content) return;

    await ctx.db.insert("chatMessages", {
      userId: user._id,
      role: "employee",
      content,
      status: "sent",
    });

    // Insert a pending Boss message — the action will fill in the real reply
    const pendingId = await ctx.db.insert("chatMessages", {
      userId: user._id,
      role: "boss",
      content: "...",
      status: "sending",
    });

    await ctx.scheduler.runAfter(0, internal.chat.askBoss, {
      userId: user._id,
      pendingMessageId: pendingId,
    });
  },
});

/**
 * Internal — gather context for the prompt (avoids leaking auth into the action).
 */
export const _gatherContext = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const todaysTasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId_dueDate", (q) =>
        q.eq("userId", args.userId).eq("dueDate", todayStr)
      )
      .collect();

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", args.userId).eq("status", "active")
      )
      .collect();

    const recentMessages = await ctx.db
      .query("chatMessages")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(20);

    return {
      displayName: user.displayName,
      personality: user.bossSettings.personality,
      streak: user.currentStreak,
      todaysTasks: todaysTasks.map((t) => ({
        title: t.title,
        status: t.status,
        dueTime: t.dueTime,
        priority: t.priority,
      })),
      projects: projects.map((p) => ({
        title: p.title,
        annualPotential: p.annualPotential,
        progressPercentage: p.progressPercentage,
      })),
      // history oldest first
      history: recentMessages
        .reverse()
        .filter((m) => m.status !== "sending")
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content })),
    };
  },
});

/**
 * Internal — patch the pending Boss message once we have a reply.
 */
export const _updateMessage = internalMutation({
  args: {
    messageId: v.id("chatMessages"),
    content: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      content: args.content,
      status: args.status,
    });
  },
});

/**
 * Calls OpenAI GPT-4o with the user's context + personality system prompt.
 * Reads OPENAI_API_KEY from Convex env vars.
 */
export const askBoss = internalAction({
  args: {
    userId: v.id("users"),
    pendingMessageId: v.id("chatMessages"),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(internal.chat._updateMessage, {
        messageId: args.pendingMessageId,
        content:
          "I'm not configured yet. Set ANTHROPIC_API_KEY via `npx convex env set` and try again.",
        status: "failed",
      });
      return;
    }

    const ctxData = await ctx.runQuery(internal.chat._gatherContext, {
      userId: args.userId,
    });
    if (!ctxData) {
      await ctx.runMutation(internal.chat._updateMessage, {
        messageId: args.pendingMessageId,
        content: "Couldn't load your context. Try again.",
        status: "failed",
      });
      return;
    }

    const personalityPrompt =
      PERSONALITY_PROMPTS[ctxData.personality] ?? PERSONALITY_PROMPTS.tough_coach;

    const completedToday = ctxData.todaysTasks.filter(
      (t) => t.status === "completed"
    ).length;
    const totalToday = ctxData.todaysTasks.length;

    const dailyPotential = ctxData.projects.reduce(
      (sum, p) => sum + Math.round(p.annualPotential / 365),
      0
    );

    const systemPrompt = `${personalityPrompt}

You are messaging an employee named ${ctxData.displayName}. Always address them by name occasionally.

REAL-TIME CONTEXT (use this to make replies concrete):
- Current streak: ${ctxData.streak} days
- Today's tasks: ${completedToday}/${totalToday} done
${ctxData.todaysTasks
  .map(
    (t) =>
      `  • [${t.status}] ${t.title}${t.dueTime ? ` (due ${t.dueTime})` : ""}`
  )
  .join("\n")}
- Active projects: ${ctxData.projects.length}
${ctxData.projects
  .map(
    (p) =>
      `  • ${p.title}: ${Math.round(p.progressPercentage)}% — $${Math.round(p.annualPotential / 365).toLocaleString()}/day at stake`
  )
  .join("\n")}
- Today's combined opportunity cost: $${dailyPotential.toLocaleString()}

RULES:
- Speak in 1–3 sentences max. Never paragraphs.
- Reference real data above (specific task names, numbers, streak).
- Never break character. Never apologize or say "I'm an AI."
- Don't praise mediocre work. Push back on excuses.
- Use the user's first name occasionally.`;

    // Anthropic uses a separate `system` field and alternating user/assistant
    // messages. The first message in the history must be from the user.
    const history = ctxData.history.map((m) => ({
      role: m.role === "boss" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));
    // Ensure first message is user-role (drop leading assistant messages)
    while (history.length > 0 && history[0].role === "assistant") {
      history.shift();
    }
    // If empty, prime with a placeholder user message
    const messages = history.length > 0 ? history : [{ role: "user" as const, content: "Hi" }];

    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          system: systemPrompt,
          messages,
          max_tokens: 300,
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        throw new Error(`Anthropic ${resp.status}: ${errBody.slice(0, 200)}`);
      }

      const data: any = await resp.json();
      const reply =
        data?.content?.[0]?.text?.trim() || "(The Boss is silent.)";

      await ctx.runMutation(internal.chat._updateMessage, {
        messageId: args.pendingMessageId,
        content: reply,
        status: "sent",
      });
    } catch (err: any) {
      await ctx.runMutation(internal.chat._updateMessage, {
        messageId: args.pendingMessageId,
        content: `Connection error: ${err?.message ?? "unknown"}. Try again.`,
        status: "failed",
      });
    }
  },
});

/**
 * Clear all chat history for the current user.
 */
export const clearHistory = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    await Promise.all(messages.map((m) => ctx.db.delete(m._id)));
  },
});
