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
import { useRouter } from "expo-router";
import { api } from "../../convex/_generated/api";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

const TIER_COLORS: Record<string, string> = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  platinum: "#E5E4E2",
};

export default function AchievementsScreen() {
  const router = useRouter();
  const badges = useQuery(api.achievements.list);

  const loading = badges === undefined;
  const unlocked = (badges ?? []).filter((b) => b.unlocked);
  const locked = (badges ?? []).filter((b) => !b.unlocked);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Achievements</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Summary */}
          <View style={styles.summary}>
            <View style={styles.summaryCircle}>
              <Text style={styles.summaryNum}>{unlocked.length}</Text>
              <Text style={styles.summaryDenom}>/ {badges!.length}</Text>
            </View>
            <Text style={styles.summaryLabel}>UNLOCKED</Text>
          </View>

          {/* Unlocked */}
          {unlocked.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>EARNED · {unlocked.length}</Text>
              <View style={styles.grid}>
                {unlocked.map((b) => (
                  <Badge key={b.id} badge={b} />
                ))}
              </View>
            </View>
          )}

          {/* Locked */}
          {locked.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>LOCKED · {locked.length}</Text>
              <View style={styles.grid}>
                {locked.map((b) => (
                  <Badge key={b.id} badge={b} />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Badge({ badge }: { badge: any }) {
  const tierColor = TIER_COLORS[badge.tier] ?? colors.textMuted;
  const pct =
    badge.progress && badge.progress.goal > 0
      ? Math.round((badge.progress.current / badge.progress.goal) * 100)
      : badge.unlocked
        ? 100
        : 0;

  return (
    <View
      style={[
        styles.badge,
        badge.unlocked && { borderColor: tierColor },
        !badge.unlocked && { opacity: 0.5 },
      ]}
    >
      <Text style={styles.emoji}>{badge.emoji}</Text>
      <Text style={styles.name}>{badge.name}</Text>
      <Text style={styles.desc} numberOfLines={2}>
        {badge.description}
      </Text>
      {badge.progress && !badge.unlocked && (
        <>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {badge.progress.current.toLocaleString()} /{" "}
            {badge.progress.goal.toLocaleString()}
          </Text>
        </>
      )}
      {badge.unlocked && (
        <View style={[styles.tierBadge, { backgroundColor: tierColor + "30" }]}>
          <Text style={[styles.tierText, { color: tierColor }]}>
            {badge.tier.toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  summary: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  summaryCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  summaryNum: { color: colors.primary, fontSize: 44, fontWeight: "800" },
  summaryDenom: { color: colors.textMuted, fontSize: fontSize.md, fontWeight: "700" },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 2,
  },
  section: { gap: spacing.sm },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  badge: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: "center",
    gap: 4,
  },
  emoji: { fontSize: 36, marginBottom: 4 },
  name: { color: colors.text, fontSize: fontSize.sm, fontWeight: "800", textAlign: "center" },
  desc: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    textAlign: "center",
    lineHeight: 16,
  },
  progressBar: {
    height: 4,
    width: "100%",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 4,
  },
  progressFill: { height: "100%", backgroundColor: colors.primary },
  progressText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "600",
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 4,
  },
  tierText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
});
