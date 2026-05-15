import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const challenge = useQuery(api.challenges.get, {
    challengeId: id as Id<"challenges">,
  });

  if (challenge === undefined) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (challenge === null) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Ionicons name="alert-circle-outline" size={56} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>Challenge not found</Text>
        <TouchableOpacity style={styles.cta} onPress={() => router.back()}>
          <Text style={styles.ctaText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const endMs = Date.parse(challenge.endDate + "T23:59:59");
  const daysLeft = Math.max(
    0,
    Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24))
  );
  const ended = endMs < Date.now();

  // Find leader
  const sorted = [...challenge.participants].sort(
    (a, b) => b.completionPercentage - a.completionPercentage
  );
  const leader = sorted[0];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Challenge</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.challengeName}>{challenge.title}</Text>
          {challenge.description && (
            <Text style={styles.description}>{challenge.description}</Text>
          )}
          <View style={styles.stakeRow}>
            <Text style={styles.stakeLabel}>STAKE</Text>
            <Text style={styles.stakeValue}>${challenge.stakeAmount}</Text>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {new Date(challenge.startDate + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}{" "}
                →{" "}
                {new Date(challenge.endDate + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {ended ? "Ended" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
              </Text>
            </View>
          </View>
        </View>

        {/* Leaderboard */}
        <View style={styles.section}>
          <Text style={styles.label}>LEADERBOARD</Text>
          {sorted.map((p, idx) => (
            <View
              key={p.userId}
              style={[
                styles.boardRow,
                idx === 0 && styles.boardRowLeader,
                p.isMe && styles.boardRowMe,
              ]}
            >
              <Text
                style={[
                  styles.rank,
                  idx === 0 && { color: "#FFD700" },
                ]}
              >
                #{idx + 1}
              </Text>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {p.displayName[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.boardName}>
                  {p.isMe ? "You" : p.displayName}
                </Text>
                <Text style={styles.boardMeta}>
                  {p.tasksCompleted}/{p.tasksTotal} tasks
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", minWidth: 60 }}>
                <Text
                  style={[
                    styles.boardPct,
                    idx === 0 && { color: "#FFD700" },
                  ]}
                >
                  {p.completionPercentage}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Payout info */}
        <View style={styles.payoutCard}>
          <View style={styles.payoutHeader}>
            <Ionicons
              name={challenge.penaltyTarget === "winner" ? "trophy" : "heart"}
              size={20}
              color={colors.primary}
            />
            <Text style={styles.payoutTitle}>
              {challenge.penaltyTarget === "winner"
                ? "Winner takes the pot"
                : "Loser donates to charity"}
            </Text>
          </View>
          {ended ? (
            <Text style={styles.payoutDesc}>
              {leader && leader.completionPercentage > 0
                ? `${leader.isMe ? "You" : leader.displayName} took the lead with ${leader.completionPercentage}%.`
                : "Nobody completed tasks. Tied result."}
            </Text>
          ) : (
            <Text style={styles.payoutDesc}>
              Honour-system payment for now. Stripe-automated payouts coming soon.
            </Text>
          )}
        </View>

        {/* Add task hint */}
        {!ended && (
          <View style={styles.hint}>
            <Ionicons name="information-circle" size={18} color={colors.yellow} />
            <Text style={styles.hintText}>
              Add tasks to this challenge from the task creation sheet (coming
              soon). For now, your overall task completion rate counts.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },
  hero: { gap: spacing.sm, alignItems: "center" },
  challengeName: { color: colors.text, fontSize: fontSize.xxl, fontWeight: "800" },
  description: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  stakeRow: { alignItems: "center", marginTop: spacing.sm },
  stakeLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  stakeValue: {
    color: colors.primary,
    fontSize: fontSize.display,
    fontWeight: "800",
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: colors.textMuted, fontSize: fontSize.xs },
  section: { gap: spacing.sm },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  boardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  boardRowLeader: { borderColor: "#FFD700" },
  boardRowMe: { backgroundColor: "rgba(34, 197, 94, 0.08)", borderColor: colors.primary },
  rank: { color: colors.textSecondary, fontSize: fontSize.lg, fontWeight: "800", width: 32 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.text, fontSize: fontSize.sm, fontWeight: "800" },
  boardName: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  boardMeta: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
  boardPct: { color: colors.text, fontSize: fontSize.lg, fontWeight: "800" },
  payoutCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  payoutHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  payoutTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  payoutDesc: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20 },
  hint: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: "rgba(234, 179, 8, 0.1)",
    borderWidth: 1,
    borderColor: colors.yellow,
    borderRadius: borderRadius.md,
  },
  hintText: { flex: 1, color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 18 },
  emptyTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  cta: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  ctaText: { color: colors.background, fontSize: fontSize.md, fontWeight: "700" },
});
