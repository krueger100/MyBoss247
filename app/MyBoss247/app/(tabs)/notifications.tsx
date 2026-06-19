import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "../../convex/_generated/api";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

const OVERDUE = "#EF4444"; // red
const UPCOMING = "#F59E0B"; // amber

function fmtOverdue(h: number): string {
  if (h < 1) return "Overdue";
  if (h < 24) return `Overdue ${h}h`;
  return `Overdue ${Math.floor(h / 24)}d`;
}
function fmtUpcoming(h: number): string {
  if (h <= 1) return "Due within the hour";
  if (h < 24) return `Due in ${h}h`;
  return `Due in ${Math.round(h / 24)}d`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const data = useQuery(api.notifications.list, {});
  const loading = data === undefined;
  const overdue = data?.overdue ?? [];
  const upcoming = data?.upcoming ?? [];
  const total = data?.total ?? 0;

  const renderItem = (n: any, accent: string, sub: string) => (
    <TouchableOpacity
      key={n.taskId}
      style={[styles.item, { borderLeftColor: accent }]}
      onPress={() => router.push(`/task/${n.taskId}`)}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {n.title}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.dot, { backgroundColor: n.projectColor }]} />
          <Text style={styles.meta} numberOfLines={1}>
            {n.projectTitle}
          </Text>
        </View>
      </View>
      <Text style={[styles.sub, { color: accent }]}>{sub}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Ionicons name="notifications" size={22} color={colors.text} />
        <Text style={styles.title}>Notifications</Text>
        {total > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{total}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : total === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="checkmark-circle-outline"
            size={56}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyTitle}>You're all caught up</Text>
          <Text style={styles.emptySub}>No overdue or upcoming tasks.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          {overdue.length > 0 && (
            <>
              <Text style={[styles.section, { color: OVERDUE }]}>
                OVERDUE · {overdue.length}
              </Text>
              {overdue.map((n) => renderItem(n, OVERDUE, fmtOverdue(n.hoursOverdue ?? 0)))}
            </>
          )}
          {upcoming.length > 0 && (
            <>
              <Text
                style={[
                  styles.section,
                  { color: UPCOMING, marginTop: overdue.length ? spacing.lg : 0 },
                ]}
              >
                UPCOMING · {upcoming.length}
              </Text>
              {upcoming.map((n) => renderItem(n, UPCOMING, fmtUpcoming(n.hoursUntilDue ?? 0)))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: fontSize.xl ?? fontSize.lg, fontWeight: "700", color: colors.text },
  headerBadge: {
    backgroundColor: "#EF4444",
    borderRadius: 999,
    minWidth: 22,
    paddingHorizontal: 6,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.xl },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text, marginTop: spacing.sm },
  emptySub: { fontSize: fontSize.sm, color: colors.textSecondary },
  section: {
    fontSize: fontSize.xs ?? 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  itemTitle: { fontSize: fontSize.md, fontWeight: "600", color: colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  meta: { fontSize: fontSize.sm, color: colors.textSecondary, flexShrink: 1 },
  sub: { fontSize: fontSize.sm, fontWeight: "700" },
});
