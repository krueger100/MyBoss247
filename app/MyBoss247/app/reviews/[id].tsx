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

function scoreColor(score: number) {
  if (score >= 80) return colors.green;
  if (score >= 60) return colors.yellow;
  if (score >= 40) return colors.orange;
  return colors.red;
}

export default function ReviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const review = useQuery(api.reviews.get, {
    reviewId: id as Id<"performanceReviews">,
  });

  if (review === undefined) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (review === null) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Ionicons name="alert-circle-outline" size={56} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>Review not found</Text>
        <TouchableOpacity style={styles.cta} onPress={() => router.back()}>
          <Text style={styles.ctaText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const completionRate =
    review.tasksTotal > 0
      ? Math.round((review.tasksCompleted / review.tasksTotal) * 100)
      : 0;
  const captureRate =
    review.valuePotential > 0
      ? Math.round((review.valueCaptured / review.valuePotential) * 100)
      : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Performance Review</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.label}>WEEK OF</Text>
          <Text style={styles.weekRange}>
            {new Date(review.weekStartDate + "T00:00:00").toLocaleDateString(
              "en-US",
              { month: "long", day: "numeric" }
            )}{" "}
            —{" "}
            {new Date(review.weekEndDate + "T00:00:00").toLocaleDateString(
              "en-US",
              { month: "long", day: "numeric" }
            )}
          </Text>

          <View
            style={[
              styles.scoreCircle,
              { borderColor: scoreColor(review.score) },
            ]}
          >
            <Text
              style={[styles.scoreNum, { color: scoreColor(review.score) }]}
            >
              {review.score}
            </Text>
            <Text style={styles.scoreOutOf}>OUT OF 100</Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <Stat
            label="TASKS"
            value={`${review.tasksCompleted}/${review.tasksTotal}`}
            sub={`${completionRate}% completed`}
          />
          <Stat
            label="VALUE CAPTURED"
            value={`$${review.valueCaptured.toLocaleString()}`}
            sub={`${captureRate}% of $${review.valuePotential.toLocaleString()}`}
          />
          <Stat
            label="PENALTIES"
            value={`${review.penaltiesTriggered}`}
            sub={`$${review.penaltyTotal.toLocaleString()} charged`}
            danger={review.penaltiesTriggered > 0}
          />
        </View>

        {/* Boss's writeup */}
        <View style={styles.reviewBox}>
          <Text style={styles.reviewText}>{review.reviewText}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({
  label,
  value,
  sub,
  danger,
}: {
  label: string;
  value: string;
  sub: string;
  danger?: boolean;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, danger && { color: colors.red }]}>
        {value}
      </Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
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
  headerTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },
  hero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  weekRange: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  scoreNum: { fontSize: 56, fontWeight: "800" },
  scoreOutOf: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: -4,
  },
  statsGrid: { flexDirection: "row", gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: 4,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  statValue: { color: colors.text, fontSize: fontSize.md, fontWeight: "800" },
  statSub: { color: colors.textSecondary, fontSize: fontSize.xs },
  reviewBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  reviewText: {
    color: colors.text,
    fontSize: fontSize.md,
    lineHeight: 24,
  },
  emptyTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  cta: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  ctaText: { color: colors.background, fontSize: fontSize.md, fontWeight: "700" },
});
