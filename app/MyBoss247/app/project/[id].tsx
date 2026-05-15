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
import { ProjectCreateSheet } from "../../components/ProjectCreateSheet";
import { TaskCreateSheet } from "../../components/TaskCreateSheet";
import { GoalCreateSheet } from "../../components/GoalCreateSheet";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const project = useQuery(api.projects.get, { projectId: id as Id<"projects"> });
  const tasks = useQuery(api.projects.tasksForProject, {
    projectId: id as Id<"projects">,
  });
  const goals = useQuery(api.goals.listByProject, {
    projectId: id as Id<"projects">,
  });
  const toggleTask = useMutation(api.tasks.toggleComplete);

  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);

  if (project === undefined || tasks === undefined) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (project === null) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Ionicons name="alert-circle-outline" size={56} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>Project not found</Text>
        <TouchableOpacity
          style={styles.emptyCta}
          onPress={() => router.back()}
        >
          <Text style={styles.emptyCtaText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const daily = Math.round(project.annualPotential / 365);
  const monthly = Math.round(project.annualPotential / 12);
  const todayStr = new Date().toISOString().split("T")[0];

  const completed = tasks.filter((t) => t.status === "completed").length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setEditProjectOpen(true)}
          hitSlop={10}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Project hero */}
        <View style={styles.hero}>
          <View
            style={[styles.iconCircle, { backgroundColor: project.colour + "20" }]}
          >
            <Text style={styles.iconText}>{project.icon}</Text>
          </View>
          <Text style={styles.title}>{project.title}</Text>
          {project.description && (
            <Text style={styles.description}>{project.description}</Text>
          )}

          {/* Stats card */}
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>DAILY</Text>
              <Text style={[styles.statValue, { color: project.colour }]}>
                ${daily.toLocaleString()}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>MONTHLY</Text>
              <Text style={styles.statValue}>
                ${monthly.toLocaleString()}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>YEARLY</Text>
              <Text style={styles.statValue}>
                ${project.annualPotential.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressTop}>
              <Text style={styles.progressLabel}>PROGRESS</Text>
              <Text style={styles.progressValue}>
                {Math.round(project.progressPercentage)}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${project.progressPercentage}%`,
                    backgroundColor: project.colour,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressSub}>
              {completed} of {tasks.length} tasks completed
            </Text>
          </View>
        </View>

        {/* Goals */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Goals</Text>
          <TouchableOpacity
            onPress={() => {
              setEditingGoal(null);
              setGoalSheetOpen(true);
            }}
          >
            <Text style={styles.sectionAction}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {goals === undefined ? (
          <ActivityIndicator color={colors.primary} />
        ) : goals.length === 0 ? (
          <View style={styles.emptyTasks}>
            <Text style={styles.emptyTasksText}>
              No goals yet. Add yearly/quarterly targets to organize tasks.
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {goals.map((g) => (
              <TouchableOpacity
                key={g._id}
                style={styles.goalCard}
                onPress={() => router.push(`/goal/${g._id}`)}
                onLongPress={() => {
                  setEditingGoal({
                    _id: g._id,
                    title: g.title,
                    description: g.description,
                    timeframe: g.timeframe,
                    startDate: g.startDate,
                    dueDate: g.dueDate,
                  });
                  setGoalSheetOpen(true);
                }}
                delayLongPress={350}
              >
                <View style={styles.goalHeader}>
                  <View style={styles.timeframeBadge}>
                    <Text style={styles.timeframeBadgeText}>
                      {g.timeframe.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.goalProgress}>
                    {Math.round(g.progressPercentage)}%
                  </Text>
                </View>
                <Text style={styles.goalTitle}>{g.title}</Text>
                {g.description && (
                  <Text style={styles.goalDesc}>{g.description}</Text>
                )}
                <Text style={styles.goalDue}>
                  Due{" "}
                  {new Date(g.dueDate + "T00:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
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

        {tasks.length === 0 ? (
          <View style={styles.emptyTasks}>
            <Text style={styles.emptyTasksText}>
              No tasks yet. Tap + Add to create one.
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {tasks.map((task) => (
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
                activeOpacity={0.7}
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

      <ProjectCreateSheet
        visible={editProjectOpen}
        onClose={() => setEditProjectOpen(false)}
        editingProject={{
          _id: project._id,
          title: project.title,
          description: project.description,
          icon: project.icon,
          colour: project.colour,
          annualPotential: project.annualPotential,
        }}
      />

      <TaskCreateSheet
        visible={taskSheetOpen}
        onClose={() => {
          setTaskSheetOpen(false);
          setEditingTask(null);
        }}
        defaultProjectId={project._id}
        editingTask={editingTask}
      />

      <GoalCreateSheet
        visible={goalSheetOpen}
        onClose={() => {
          setGoalSheetOpen(false);
          setEditingGoal(null);
        }}
        projectId={project._id}
        editingGoal={editingGoal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
  },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  hero: { alignItems: "center", gap: spacing.md },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 36 },
  title: { color: colors.text, fontSize: fontSize.xxl, fontWeight: "800" },
  description: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: "center",
    marginHorizontal: spacing.md,
  },
  statsCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  statValue: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  divider: { height: 1, backgroundColor: colors.borderLight },
  progressSection: { width: "100%", marginTop: spacing.sm, gap: spacing.sm },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
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
  progressFill: { height: "100%" },
  progressSub: { color: colors.textMuted, fontSize: fontSize.xs },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  sectionAction: { color: colors.primary, fontSize: fontSize.sm, fontWeight: "600" },
  emptyTasks: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    alignItems: "center",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTasksText: { color: colors.textSecondary, fontSize: fontSize.sm },
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
  goalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeframeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: borderRadius.sm,
  },
  timeframeBadgeText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  goalProgress: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: "800",
  },
  goalTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  goalDesc: { color: colors.textSecondary, fontSize: fontSize.xs },
  goalDue: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 4 },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  emptyCta: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  emptyCtaText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
