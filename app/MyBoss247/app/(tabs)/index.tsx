import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "../../convex/_generated/api";
import { TaskCreateSheet } from "../../components/TaskCreateSheet";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

export default function DashboardScreen() {
  const { user } = useUser();
  const router = useRouter();

  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const todayStr = new Date().toISOString().split("T")[0];
  const tasks = useQuery(api.tasks.listAll);
  const projects = useQuery(api.projects.list);
  const convexUser = useQuery(api.users.getCurrentUser);
  const toggleTask = useMutation(api.tasks.toggleComplete);

  const loading = tasks === undefined || projects === undefined;

  // Combined daily value across all active projects
  const dailyPotential = useMemo(() => {
    if (!projects) return 0;
    return projects.reduce(
      (sum, p) => sum + Math.round(p.annualPotential / 365),
      0
    );
  }, [projects]);

  const todaysTasks = tasks?.filter((t) => t.dueDate === todayStr) ?? [];
  const completedTasks = todaysTasks.filter((t) => t.status === "completed");
  const totalTasks = todaysTasks.length;
  const completionRatio = totalTasks > 0 ? completedTasks.length / totalTasks : 0;
  const captured = Math.round(dailyPotential * completionRatio);
  const slipping = dailyPotential - captured;
  const capturePercent = dailyPotential > 0 ? Math.round(completionRatio * 100) : 0;

  const moneyAtStake = 0; // TODO: from active penalties
  const streak = convexUser?.currentStreak ?? 0;
  const personalDaysRemaining = convexUser?.personalDaysRemaining ?? 0;

  const highestWarning = useMemo(() => {
    if (!todaysTasks) return "green";
    if (todaysTasks.some((t) => t.warningLevel === "red" && t.status !== "completed"))
      return "red";
    if (todaysTasks.some((t) => t.warningLevel === "orange" && t.status !== "completed"))
      return "orange";
    if (todaysTasks.some((t) => t.warningLevel === "yellow" && t.status !== "completed"))
      return "yellow";
    return "green";
  }, [todaysTasks]);

  const bossMood = {
    green: { emoji: "😐", label: "On Track", color: colors.green },
    yellow: { emoji: "🤨", label: "Watching", color: colors.yellow },
    orange: { emoji: "😠", label: "Not Happy", color: colors.orange },
    red: { emoji: "🤬", label: "Furious", color: colors.red },
  }[highestWarning];

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  // Empty state — no projects yet
  if (!projects || projects.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Ionicons name="briefcase-outline" size={56} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No projects yet</Text>
        <Text style={styles.emptyText}>
          The Boss needs something to manage. Create your first project.
        </Text>
        <TouchableOpacity
          style={styles.emptyCta}
          onPress={() => router.push("/onboarding/quick-start")}
        >
          <Text style={styles.emptyCtaText}>Create Project</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Today's Briefing</Text>
            <Text style={styles.greetingSub}>
              {user?.firstName || convexUser?.displayName || "Employee"} ·{" "}
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.bossMoodBadge, { borderColor: bossMood.color }]}
          >
            <Text style={styles.bossMoodEmoji}>{bossMood.emoji}</Text>
            <Text style={[styles.bossMoodLabel, { color: bossMood.color }]}>
              BOSS: {bossMood.label.toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Opportunity Cost Clock */}
        <View style={styles.oppCostCard}>
          <View style={styles.oppCostHeader}>
            <Text style={styles.oppCostLabel}>TODAY IS WORTH</Text>
            <Ionicons name="time-outline" size={18} color={colors.textMuted} />
          </View>
          <Text style={styles.oppCostValue}>
            ${dailyPotential.toLocaleString()}
          </Text>
          <Text style={styles.oppCostSub}>to your future</Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${capturePercent}%` }]}
              />
            </View>
            <View style={styles.progressLabels}>
              <View>
                <Text style={styles.progressLabelCaptured}>
                  ${captured.toLocaleString()}
                </Text>
                <Text style={styles.progressSubLabel}>CAPTURED</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.progressLabelLost}>
                  ${slipping.toLocaleString()}
                </Text>
                <Text style={styles.progressSubLabel}>SLIPPING</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${moneyAtStake}</Text>
            <Text style={styles.statLabel}>AT STAKE</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {streak}
            </Text>
            <Text style={styles.statLabel}>STREAK</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {completedTasks.length}/{totalTasks}
            </Text>
            <Text style={styles.statLabel}>DONE</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{personalDaysRemaining}</Text>
            <Text style={styles.statLabel}>PTO</Text>
          </View>
        </View>

        {/* Tasks */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Tasks</Text>
          <TouchableOpacity onPress={() => setTaskSheetOpen(true)}>
            <Text style={styles.sectionAction}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {tasks.length === 0 ? (
          <View style={styles.noTasks}>
            <Text style={styles.noTasksText}>
              No tasks yet. Tap + Add to create one.
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.lg }}>
            {(() => {
              const overdue = tasks.filter(
                (t) => t.dueDate < todayStr && t.status !== "completed"
              );
              const today = tasks.filter((t) => t.dueDate === todayStr);
              const upcoming = tasks.filter((t) => t.dueDate > todayStr);

              const renderGroup = (label: string, items: typeof tasks, accent?: string) =>
                items.length === 0 ? null : (
                  <View style={{ gap: spacing.sm }} key={label}>
                    <Text
                      style={[
                        styles.groupLabel,
                        accent ? { color: accent } : undefined,
                      ]}
                    >
                      {label} · {items.length}
                    </Text>
                    {items.map((task) => (
                      <TouchableOpacity
                        key={task._id}
                        style={[
                          styles.taskItem,
                          task.dueDate < todayStr &&
                            task.status !== "completed" &&
                            styles.taskOverdue,
                        ]}
                        onPress={() => toggleTask({ taskId: task._id })}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            task.status === "completed" && styles.checkboxChecked,
                          ]}
                        >
                          {task.status === "completed" && (
                            <Ionicons
                              name="checkmark"
                              size={14}
                              color={colors.background}
                            />
                          )}
                        </View>
                        <View style={styles.taskContent}>
                          <Text
                            style={[
                              styles.taskTitle,
                              task.status === "completed" && styles.taskTitleDone,
                            ]}
                          >
                            {task.title}
                          </Text>
                          <View style={styles.taskMeta}>
                            <View
                              style={[
                                styles.projectBadge,
                                {
                                  backgroundColor: task.projectColor + "20",
                                  borderColor: task.projectColor,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.projectBadgeText,
                                  { color: task.projectColor },
                                ]}
                              >
                                {task.projectTitle}
                              </Text>
                            </View>
                            {task.dueDate !== todayStr && (
                              <Text style={styles.taskTime}>
                                {new Date(task.dueDate + "T00:00:00").toLocaleDateString(
                                  "en-US",
                                  { month: "short", day: "numeric" }
                                )}
                              </Text>
                            )}
                            {task.dueTime && (
                              <Text style={styles.taskTime}>{task.dueTime}</Text>
                            )}
                          </View>
                        </View>
                        {task.warningLevel !== "green" &&
                          task.status !== "completed" && (
                            <View
                              style={[
                                styles.warningDot,
                                {
                                  backgroundColor: colors[
                                    task.warningLevel as keyof typeof colors
                                  ] as string,
                                },
                              ]}
                            />
                          )}
                      </TouchableOpacity>
                    ))}
                  </View>
                );

              return (
                <>
                  {renderGroup("OVERDUE", overdue, colors.red)}
                  {renderGroup("TODAY", today)}
                  {renderGroup("UPCOMING", upcoming, colors.textSecondary)}
                </>
              );
            })()}
          </View>
        )}

        {/* Personal Day CTA */}
        <TouchableOpacity
          style={styles.personalDayCta}
          onPress={() =>
            Alert.alert(
              "Personal Day",
              `You have ${personalDaysRemaining} of ${convexUser?.personalDaysPerMonth ?? 0} personal days remaining this month. Invoking will be available soon.`
            )
          }
        >
          <Ionicons name="umbrella-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.personalDayText}>
            Invoke Personal Day ({personalDaysRemaining} remaining)
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <TaskCreateSheet
        visible={taskSheetOpen}
        onClose={() => setTaskSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: "center", alignItems: "center", padding: spacing.lg },
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  emptyCta: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  emptyCtaText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: "700",
    letterSpacing: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  greeting: { color: colors.text, fontSize: fontSize.xl, fontWeight: "700" },
  greetingSub: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  bossMoodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  bossMoodEmoji: { fontSize: 14 },
  bossMoodLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  oppCostCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  oppCostHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  oppCostLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  oppCostValue: {
    color: colors.text,
    fontSize: fontSize.display,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  oppCostSub: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: -4 },
  progressContainer: { marginTop: spacing.md },
  progressBar: {
    height: 8,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.primary },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  progressLabelCaptured: {
    color: colors.green,
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  progressLabelLost: {
    color: colors.red,
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  progressSubLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 2,
  },
  statsRow: { flexDirection: "row", gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  statLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  sectionTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  sectionAction: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  noTasks: {
    padding: spacing.lg,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noTasksText: { color: colors.textSecondary, fontSize: fontSize.sm },
  taskList: { gap: spacing.sm },
  groupLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskOverdue: {
    borderColor: colors.red,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  taskContent: { flex: 1 },
  taskTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "500" },
  taskTitleDone: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 6,
  },
  projectBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  projectBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  taskTime: { color: colors.textMuted, fontSize: fontSize.xs },
  warningDot: { width: 8, height: 8, borderRadius: 4 },
  personalDayCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    borderStyle: "dashed",
    marginTop: spacing.sm,
  },
  personalDayText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
