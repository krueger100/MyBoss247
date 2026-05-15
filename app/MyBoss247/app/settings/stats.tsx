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

export default function LifetimeStatsScreen() {
  const router = useRouter();
  const stats = useQuery(api.stats.lifetime);

  if (stats === undefined) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (stats === null) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Text style={styles.empty}>Stats unavailable.</Text>
      </SafeAreaView>
    );
  }

  const memberSinceLabel = new Date(stats.memberSince).toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric", year: "numeric" }
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Lifetime Stats</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.memberSince}>
          Boss Mode since {memberSinceLabel}
        </Text>

        <Section title="STREAK">
          <View style={styles.grid}>
            <BigStat
              label="Current"
              value={stats.currentStreak}
              suffix="days"
              accent={colors.primary}
            />
            <BigStat
              label="Longest"
              value={stats.longestStreak}
              suffix="days"
            />
          </View>
        </Section>

        <Section title="TASKS">
          <View style={styles.grid}>
            <BigStat
              label="Completed"
              value={stats.tasksCompleted}
              accent={colors.green}
            />
            <BigStat
              label="Overdue"
              value={stats.tasksOverdue}
              accent={
                stats.tasksOverdue > 0 ? colors.red : colors.textSecondary
              }
            />
          </View>
          <View style={styles.grid}>
            <BigStat label="Failed" value={stats.tasksFailed} />
            <BigStat label="Total" value={stats.tasksTotal} />
          </View>
        </Section>

        <Section title="OPPORTUNITY COST">
          <Row
            label="Captured"
            value={`$${stats.totalValueCaptured.toLocaleString()}`}
            color={colors.green}
          />
          <Row
            label="Of Potential"
            value={`$${stats.totalValuePotential.toLocaleString()}`}
          />
          <Row
            label="Capture Rate"
            value={`${stats.captureRate}%`}
            color={
              stats.captureRate >= 70
                ? colors.green
                : stats.captureRate >= 40
                  ? colors.yellow
                  : colors.red
            }
          />
        </Section>

        <Section title="PROJECTS">
          <Row label="Active" value={stats.projectsActive.toString()} />
          <Row label="Archived" value={stats.projectsArchived.toString()} />
        </Section>

        <Section title="ACCOUNTABILITY">
          <Row
            label="Check-ins Received"
            value={stats.checkInsTotal.toString()}
          />
          <Row
            label="Responses"
            value={stats.checkInsResponded.toString()}
          />
          <Row
            label="Response Rate"
            value={`${stats.checkInResponseRate}%`}
            color={
              stats.checkInResponseRate >= 80
                ? colors.green
                : stats.checkInResponseRate >= 50
                  ? colors.yellow
                  : colors.red
            }
          />
          <Row
            label="Personal Days Used"
            value={stats.personalDaysUsed.toString()}
          />
        </Section>

        <Section title="REVIEWS">
          <Row label="Reviews Issued" value={stats.reviewsCount.toString()} />
          {stats.avgScore !== null && (
            <Row
              label="Avg Score"
              value={`${stats.avgScore}/100`}
              color={
                stats.avgScore >= 80
                  ? colors.green
                  : stats.avgScore >= 60
                    ? colors.yellow
                    : colors.red
              }
            />
          )}
        </Section>

        <Section title="MONEY">
          <Row
            label="Penalties Paid"
            value={stats.paymentsCount.toString()}
          />
          <Row
            label="Total Charged"
            value={`$${stats.totalPaid.toLocaleString()}`}
            color={stats.totalPaid > 0 ? colors.red : colors.textSecondary}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function BigStat({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: number;
  suffix?: string;
  accent?: string;
}) {
  return (
    <View style={styles.bigStat}>
      <Text style={[styles.bigStatValue, accent && { color: accent }]}>
        {value}
        {suffix ? <Text style={styles.bigStatSuffix}> {suffix}</Text> : null}
      </Text>
      <Text style={styles.bigStatLabel}>{label}</Text>
    </View>
  );
}

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, color && { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { color: colors.textSecondary, fontSize: fontSize.md },
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
  memberSince: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: "center",
    fontStyle: "italic",
  },
  section: { gap: spacing.sm },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginLeft: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
  grid: { flexDirection: "row" },
  bigStat: {
    flex: 1,
    padding: spacing.md,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: colors.borderLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  bigStatValue: { color: colors.text, fontSize: 32, fontWeight: "800" },
  bigStatSuffix: { fontSize: fontSize.sm, fontWeight: "600", color: colors.textMuted },
  bigStatLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowLabel: { color: colors.textSecondary, fontSize: fontSize.md },
  rowValue: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
});
