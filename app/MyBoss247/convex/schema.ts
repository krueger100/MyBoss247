import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    avatarHistory: v.optional(
      v.array(
        v.object({
          url: v.string(),
          storageId: v.id("_storage"),
        })
      )
    ),
    timezone: v.string(),
    inviteCode: v.string(),
    bossSettings: v.object({
      personality: v.union(
        v.literal("drill_sergeant"),
        v.literal("tough_coach"),
        v.literal("supportive_manager")
      ),
      checkinTimes: v.object({
        morning: v.string(),
        midday: v.string(),
        afternoon: v.string(),
        evening: v.string(),
      }),
      inboxFrequency: v.union(
        v.literal("off"),
        v.literal("light"),
        v.literal("normal"),
        v.literal("intense")
      ),
      workingHoursStart: v.string(),
      workingHoursEnd: v.string(),
    }),
    stripeCustomerId: v.optional(v.string()),
    stripeConnectAccountId: v.optional(v.string()),
    contractSignedAt: v.optional(v.number()),
    personalDaysRemaining: v.number(),
    personalDaysPerMonth: v.number(),
    subscriptionTier: v.union(
      v.literal("trial"),
      v.literal("pro"),
      v.literal("vip")
    ),
    subscriptionStatus: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("cancelled"),
      v.literal("expired")
    ),
    trialEndsAt: v.optional(v.number()),
    currentStreak: v.number(),
    longestStreak: v.number(),
    onboardingStep: v.optional(v.string()),
    expoPushToken: v.optional(v.string()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_inviteCode", ["inviteCode"]),

  projects: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    colour: v.string(),
    icon: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("archived")
    ),
    sortOrder: v.number(),
    annualPotential: v.number(),
    progressPercentage: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_status", ["userId", "status"]),

  goals: defineTable({
    userId: v.id("users"),
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    timeframe: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("milestone"),
      v.literal("yearly")
    ),
    startDate: v.string(),
    dueDate: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("paused")
    ),
    parentGoalId: v.optional(v.id("goals")),
    progressPercentage: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_projectId", ["projectId"])
    .index("by_parentGoalId", ["parentGoalId"]),

  tasks: defineTable({
    goalId: v.optional(v.id("goals")),
    userId: v.id("users"),
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.string(),
    dueTime: v.optional(v.string()),
    priority: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("overdue"),
      v.literal("failed")
    ),
    warningLevel: v.union(
      v.literal("green"),
      v.literal("yellow"),
      v.literal("orange"),
      v.literal("red")
    ),
    isRecurring: v.boolean(),
    recurrenceRule: v.optional(
      v.object({
        frequency: v.union(
          v.literal("daily"),
          v.literal("weekdays"),
          v.literal("weekly"),
          v.literal("monthly")
        ),
        daysOfWeek: v.optional(v.array(v.number())),
        dayOfMonth: v.optional(v.number()),
      })
    ),
    completedAt: v.optional(v.number()),
    sortOrder: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_dueDate", ["userId", "dueDate"])
    .index("by_userId_status", ["userId", "status"])
    .index("by_projectId", ["projectId"])
    .index("by_goalId", ["goalId"]),

  penalties: defineTable({
    userId: v.id("users"),
    penaltyTarget: v.union(v.literal("charity"), v.literal("partner")),
    charityName: v.optional(v.string()),
    charityStripeId: v.optional(v.string()),
    partnerId: v.optional(v.id("users")),
    amount: v.number(),
    triggerType: v.union(
      v.literal("task_missed"),
      v.literal("goal_missed"),
      v.literal("milestone_missed"),
      v.literal("challenge_lost")
    ),
    linkedGoalId: v.optional(v.id("goals")),
    linkedTaskId: v.optional(v.id("tasks")),
    linkedChallengeId: v.optional(v.id("challenges")),
    isActive: v.boolean(),
  }).index("by_userId", ["userId"]),

  penaltyPayments: defineTable({
    penaltyId: v.id("penalties"),
    payerUserId: v.id("users"),
    recipientUserId: v.optional(v.id("users")),
    amount: v.number(),
    stripePaymentId: v.optional(v.string()),
    stripeTransferId: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("charged"),
      v.literal("transferred"),
      v.literal("failed")
    ),
    chargedAt: v.optional(v.number()),
  })
    .index("by_payerUserId", ["payerUserId"])
    .index("by_penaltyId", ["penaltyId"]),

  checkIns: defineTable({
    userId: v.id("users"),
    taskId: v.optional(v.id("tasks")),
    bossMessage: v.string(),
    employeeResponse: v.optional(v.string()),
    checkInType: v.union(
      v.literal("morning"),
      v.literal("midday"),
      v.literal("afternoon"),
      v.literal("evening"),
      v.literal("warning"),
      v.literal("inbox")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("responded"),
      v.literal("missed")
    ),
    scheduledFor: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_status", ["userId", "status"]),

  chatMessages: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("boss"), v.literal("employee")),
    content: v.string(),
    status: v.optional(
      v.union(v.literal("sending"), v.literal("sent"), v.literal("failed"))
    ),
  }).index("by_userId", ["userId"]),

  performanceReviews: defineTable({
    userId: v.id("users"),
    weekStartDate: v.string(),
    weekEndDate: v.string(),
    score: v.number(),
    tasksCompleted: v.number(),
    tasksTotal: v.number(),
    penaltiesTriggered: v.number(),
    penaltyTotal: v.number(),
    reviewText: v.string(),
    valueCaptured: v.number(),
    valuePotential: v.number(),
  }).index("by_userId", ["userId"]),

  paymentMethods: defineTable({
    userId: v.id("users"),
    stripeCustomerId: v.string(),
    stripePaymentMethodId: v.string(),
    isDefault: v.boolean(),
  }).index("by_userId", ["userId"]),

  partnerships: defineTable({
    partnerAId: v.id("users"),
    partnerBId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("ended")
    ),
    defaultPenaltyAmount: v.optional(v.number()),
  })
    .index("by_partnerAId", ["partnerAId"])
    .index("by_partnerBId", ["partnerBId"]),

  challenges: defineTable({
    createdBy: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    stakeAmount: v.number(),
    penaltyTarget: v.union(v.literal("charity"), v.literal("winner")),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    winnerId: v.optional(v.id("users")),
  })
    .index("by_createdBy", ["createdBy"])
    .index("by_status", ["status"]),

  challengeParticipants: defineTable({
    challengeId: v.id("challenges"),
    userId: v.id("users"),
    tasksCompleted: v.number(),
    tasksTotal: v.number(),
    completionPercentage: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("won"),
      v.literal("lost")
    ),
  })
    .index("by_challengeId", ["challengeId"])
    .index("by_userId", ["userId"]),

  challengeTasks: defineTable({
    challengeId: v.id("challenges"),
    taskId: v.id("tasks"),
    userId: v.id("users"),
    countedForChallenge: v.boolean(),
  })
    .index("by_challengeId", ["challengeId"])
    .index("by_taskId", ["taskId"]),

  personalDaysLog: defineTable({
    userId: v.id("users"),
    dateUsed: v.string(),
    reason: v.optional(v.string()),
    streakProtected: v.number(),
  }).index("by_userId", ["userId"]),

  vipChallenges: defineTable({
    createdBy: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    stakeAmount: v.number(),
    escrowStripePaymentIntentId: v.optional(v.string()),
    verifierId: v.optional(v.id("verifiers")),
    verifierFeePercent: v.number(),
    status: v.union(
      v.literal("pending_escrow"),
      v.literal("active"),
      v.literal("evidence_submitted"),
      v.literal("under_review"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    winnerId: v.optional(v.id("users")),
    verifierDecisionText: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    decidedAt: v.optional(v.number()),
  })
    .index("by_createdBy", ["createdBy"])
    .index("by_status", ["status"]),

  vipParticipants: defineTable({
    vipChallengeId: v.id("vipChallenges"),
    userId: v.id("users"),
    status: v.union(
      v.literal("escrow_pending"),
      v.literal("active"),
      v.literal("evidence_submitted"),
      v.literal("won"),
      v.literal("lost")
    ),
    escrowCharged: v.boolean(),
    escrowStripeId: v.optional(v.string()),
  })
    .index("by_vipChallengeId", ["vipChallengeId"])
    .index("by_userId", ["userId"]),

  vipMilestones: defineTable({
    vipChallengeId: v.id("vipChallenges"),
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    successCriteria: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("evidence_submitted"),
      v.literal("verified"),
      v.literal("failed")
    ),
    evidenceSubmittedAt: v.optional(v.number()),
    verifiedAt: v.optional(v.number()),
  })
    .index("by_vipChallengeId", ["vipChallengeId"])
    .index("by_userId", ["userId"]),

  vipEvidence: defineTable({
    vipMilestoneId: v.id("vipMilestones"),
    userId: v.id("users"),
    evidenceType: v.union(
      v.literal("screenshot"),
      v.literal("url"),
      v.literal("video"),
      v.literal("document")
    ),
    fileUrl: v.string(),
    description: v.optional(v.string()),
    submittedAt: v.number(),
  }).index("by_vipMilestoneId", ["vipMilestoneId"]),

  verifiers: defineTable({
    name: v.string(),
    email: v.string(),
    bio: v.optional(v.string()),
    expertiseAreas: v.array(v.string()),
    verified: v.boolean(),
    totalChallengesReviewed: v.number(),
  }).index("by_email", ["email"]),
});
