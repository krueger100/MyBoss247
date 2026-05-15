import { useState } from "react";
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
import { useQuery, useMutation } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { GoalCreateSheet } from "../../components/GoalCreateSheet";
import { TaskCreateSheet } from "../../components/TaskCreateSheet";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const goal = useQuery(api.goals.get, { goalId: id as Id<"goals"> });
  const toggleTask = useMutation(api.tasks.toggleComplete);

  const [editGoalOpen, setEditGoalOpen] = useState(false);
  const [childGoalOpen, setChildGoalOpen] = useState(false);
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  if (goal === undefined) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (goal === null) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Ionicons name="alert-circle-outline" size={56} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>Goal not found</Text>
        <TouchableOpacity style={styles.cta} onPress={() => router.back()}>
          <Text style={styles.ctaText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setEditGoalOpen(true)} hitSlop={10}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.timeframeBadge}>
            <Text style={styles.timeframeBadgeText}>
              {goal.timeframe.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.title}>{goal.title}</Text>
          {goal.description && (
            <Text style={styles.description}>{goal.description}</Text>
          )}

          <View style={styles.datesRow}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateLabel}>STARTS</Text>
              <Text style={styles.dateValue}>
                {new Date(goal.startDate + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
            <View style={styles.dateBlock}>
              <Text style={styles.dateLabel}>DUE</Text>
              <Text style={styles.dateValue}>
                {new Date(goal.dueDate + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          </View>

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressTop}>
              <Text style={styles.label}>PROGRESS</Text>
              <Text style={styles.progressValue}>
                {Math.round(goal.progressPercentage)}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${goal.progressPercentage}%` },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Child goals */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Sub-goals</Text>
          <TouchableOpacity onPress={() => setChildGoalOpen(true)}>
            <Text style={styles.sectionAction}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {goal.children.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Break this down. Smaller goals make this manageable.
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {goal.children.map((c) => (
              <TouchableOpacity
                key={c._id}
                style={styles.subGoalCard}
                onPress={() => router.push(`/goal/${c._id}`)}
              >
                <View style={styles.subGoalHeader}>
                  <Text style={styles.subGoalTimeframe}>
                    {c.timeframe.toUpperCase()}
                  </Text>
                  <Text style={styles.subGoalProgress}>
                    {Math.round(c.progressPercentage)}%
                  </Text>
                </View>
                <Text style={styles.subGoalTitle}>{c.title}</Text>
                <View style={styles.miniProgressBar}>
                  <View
                    style={[
                      styles.miniProgressFill,
                      { width: `${c.progressPercentage}%` },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tasks */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tasks</Text>
          <TouchableOpacity
            onPress={() => {
              setEditingTask(null);
              setTaskSheetOpen(true);
            }}
          >
            <Text style={styles.sectionAction}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {goal.tasks.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              No tasks scoped to this goal yet. Add specific actions to ship it.
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {goal.tasks.map((task) => (
              <TouchableOpacity
                key={task._id}
                style={[
                  styles.taskItem,
                  task.dueDate < todayStr &&
                    task.status !== "completed" &&
                    styles.taskOverdue,
                ]}
                onPress={() => toggleTask({ taskId: task._id })}
                onLongPress={() => {
                  setEditingTask({
                    _id: task._id,
                    title: task.title,
                    description: task.description,
                    projectId: task.projectId,
                    dueDate: task.dueDate,
                    dueTime: task.dueTime,
                    priority: task.priority,
                  });
                  setTaskSheetOpen(true);
                }}
                delayLongPress={350}
              >
                <View
                  style={[
                    styles.checkbox,
                    task.status === "completed" && styles.checkboxChecked,
                  ]}
                >
                  {task.status === "completed" && (
                    <Ionicons name="checkmark" size={14} color={colors.background} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.taskTitle,
                      task.status === "completed" && styles.taskDone,
                    ]}
                  >
                    {task.title}
                  </Text>
                  <Text style={styles.taskMeta}>
                    {new Date(task.dueDate + "T00:00:00").toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" }
                    )}
                    {task.dueTime ? ` · ${task.dueTime}` : ""}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <GoalCreateSheet
        visible={editGoalOpen}
        onClose={() => setEditGoalOpen(false)}
        projectId={goal.projectId}
        editingGoal={{
          _id: goal._id,
          title: goal.title,
          description: goal.description,
          timeframe: goal.timeframe,
          startDate: goal.startDate,
          dueDate: goal.dueDate,
        }}
      />

      <GoalCreateSheet
        visible={childGoalOpen}
        onClose={() => setChildGoalOpen(false)}
        projectId={goal.projectId}
        parentGoalId={goal._id}
      />

      <TaskCreateSheet
        visible={taskSheetOpen}
        onClose={() => {
          setTaskSheetOpen(false);
          setEditingTask(null);
        }}
        defaultProjectId={goal.projectId}
        editingTask={editingTask}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.md },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
  },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  hero: { alignItems: "center", gap: spacing.sm },
  timeframeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: borderRadius.full,
  },
  timeframeBadgeText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: "800",
    textAlign: "center",
  },
  description: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: "center",
    marginHorizontal: spacing.md,
  },
  datesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  dateBlock: { alignItems: "center" },
  dateLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  dateValue: { color: colors.text, fontSize: fontSize.md, fontWeight: "700", marginTop: 2 },
  progressSection: { width: "100%", marginTop: spacing.lg, gap: spacing.sm },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  progressValue: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  progressBar: {
    height: 8,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.primary },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  sectionAction: { color: colors.primary, fontSize: fontSize.sm, fontWeight: "600" },
  empty: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: "center" },
  subGoalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
  },
  subGoalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subGoalTimeframe: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  subGoalProgress: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: "800",
  },
  subGoalTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  miniProgressBar: {
    height: 4,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 4,
  },
  miniProgressFill: { height: "100%", backgroundColor: colors.primary },
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
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  taskTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "500" },
  taskDone: { textDecorationLine: "line-through", color: colors.textMuted },
  taskMeta: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
  emptyTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  cta: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  ctaText: { color: colors.background, fontSize: fontSize.md, fontWeight: "700" },
});
