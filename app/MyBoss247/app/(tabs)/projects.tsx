import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import type { Id } from "../../convex/_generated/dataModel";
import { useRouter } from "expo-router";
import { api } from "../../convex/_generated/api";
import { ProjectCreateSheet } from "../../components/ProjectCreateSheet";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

export default function ProjectsScreen() {
  const router = useRouter();
  const [view, setView] = useState<"projects" | "tasks">("projects");
  const [projectSheetOpen, setProjectSheetOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [reorderMode, setReorderMode] = useState(false);
  const reorderProjects = useMutation(api.projects.reorder);

  const projects = useQuery(api.projects.list);
  const todayStr = new Date().toISOString().split("T")[0];
  const allTasks = useQuery(api.tasks.listAll);
  const todayTasks = useQuery(api.tasks.today, { dueDate: todayStr });

  const taskCountsByProject = useMemo(() => {
    const counts: Record<string, { today: number; total: number }> = {};
    if (todayTasks) {
      for (const t of todayTasks) {
        if (!counts[t.projectId]) counts[t.projectId] = { today: 0, total: 0 };
        counts[t.projectId].today++;
        counts[t.projectId].total++;
      }
    }
    return counts;
  }, [todayTasks]);

  const loading = projects === undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Projects</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {view === "projects" && projects && projects.length > 1 && (
            <TouchableOpacity
              style={[
                styles.reorderBtn,
                reorderMode && styles.reorderBtnActive,
              ]}
              onPress={() => setReorderMode((v) => !v)}
            >
              <Ionicons
                name={reorderMode ? "checkmark" : "swap-vertical"}
                size={18}
                color={reorderMode ? colors.background : colors.text}
              />
            </TouchableOpacity>
          )}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            setEditingProject(null);
            setProjectSheetOpen(true);
          }}
        >
          <Ionicons name="add" size={22} color={colors.background} />
        </TouchableOpacity>
        </View>
      </View>

      <View style={styles.segment}>
        <TouchableOpacity
          style={[styles.segmentBtn, view === "projects" && styles.segmentActive]}
          onPress={() => setView("projects")}
        >
          <Text
            style={[
              styles.segmentText,
              view === "projects" && styles.segmentTextActive,
            ]}
          >
            Projects
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, view === "tasks" && styles.segmentActive]}
          onPress={() => setView("tasks")}
        >
          <Text
            style={[
              styles.segmentText,
              view === "tasks" && styles.segmentTextActive,
            ]}
          >
            All Tasks
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {view === "projects" &&
            (projects.length === 0 ? (
              <EmptyState
                icon="briefcase-outline"
                title="No projects on the board"
                description="I can't manage what doesn't exist. Spin one up so we can get to work."
                actionLabel="Create Project"
                onAction={() => {
                  setEditingProject(null);
                  setProjectSheetOpen(true);
                }}
              />
            ) : (
              projects.map((p, idx) => {
                const daily = Math.round(p.annualPotential / 365);
                const counts = taskCountsByProject[p._id] ?? {
                  today: 0,
                  total: 0,
                };

                const moveProject = async (direction: -1 | 1) => {
                  const next = [...projects];
                  const target = idx + direction;
                  if (target < 0 || target >= next.length) return;
                  [next[idx], next[target]] = [next[target], next[idx]];
                  await reorderProjects({
                    orderedIds: next.map((x) => x._id as Id<"projects">),
                  });
                };

                return (
                  <TouchableOpacity
                    key={p._id}
                    style={styles.projectCard}
                    activeOpacity={reorderMode ? 1 : 0.8}
                    disabled={reorderMode}
                    onPress={() => router.push(`/project/${p._id}`)}
                    onLongPress={() => {
                      setEditingProject({
                        _id: p._id,
                        title: p.title,
                        description: p.description,
                        icon: p.icon,
                        colour: p.colour,
                        annualPotential: p.annualPotential,
                      });
                      setProjectSheetOpen(true);
                    }}
                    delayLongPress={350}
                  >
                    <View style={styles.projectHeader}>
                      <View style={styles.projectLeft}>
                        <View
                          style={[
                            styles.iconCircle,
                            { backgroundColor: p.colour + "20" },
                          ]}
                        >
                          <Text style={styles.icon}>{p.icon}</Text>
                        </View>
                        <View>
                          <Text style={styles.projectTitle}>{p.title}</Text>
                          <Text style={styles.projectSub}>
                            Worth ${daily.toLocaleString()}/day
                          </Text>
                        </View>
                      </View>
                      {reorderMode ? (
                        <View style={styles.reorderArrows}>
                          <TouchableOpacity
                            style={[
                              styles.arrowBtn,
                              idx === 0 && styles.arrowBtnDisabled,
                            ]}
                            disabled={idx === 0}
                            onPress={() => moveProject(-1)}
                          >
                            <Ionicons
                              name="chevron-up"
                              size={20}
                              color={
                                idx === 0 ? colors.textMuted : colors.text
                              }
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.arrowBtn,
                              idx === projects.length - 1 && styles.arrowBtnDisabled,
                            ]}
                            disabled={idx === projects.length - 1}
                            onPress={() => moveProject(1)}
                          >
                            <Ionicons
                              name="chevron-down"
                              size={20}
                              color={
                                idx === projects.length - 1
                                  ? colors.textMuted
                                  : colors.text
                              }
                            />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <Ionicons
                          name="reorder-three"
                          size={22}
                          color={colors.textMuted}
                        />
                      )}
                    </View>

                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${p.progressPercentage}%`,
                            backgroundColor: p.colour,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.projectFooter}>
                      <Text style={styles.footerText}>
                        {Math.round(p.progressPercentage)}% complete
                      </Text>
                      <Text style={styles.footerText}>
                        {counts.today} today
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ))}

          {view === "tasks" &&
            (allTasks === undefined ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <View style={styles.searchWrap}>
                  <Ionicons
                    name="search"
                    size={18}
                    color={colors.textMuted}
                    style={{ position: "absolute", left: spacing.md, top: 14, zIndex: 1 }}
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search tasks..."
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                  />
                  {search.length > 0 && (
                    <TouchableOpacity
                      style={{ position: "absolute", right: spacing.md, top: 14 }}
                      onPress={() => setSearch("")}
                    >
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {(() => {
                  const q = search.trim().toLowerCase();
                  const filtered = q
                    ? allTasks.filter((t) =>
                        t.title.toLowerCase().includes(q) ||
                        (t.description && t.description.toLowerCase().includes(q)) ||
                        t.projectTitle.toLowerCase().includes(q)
                      )
                    : allTasks;

                  if (filtered.length === 0) {
                    return (
                      <EmptyState
                        icon={q ? "search" : "list-outline"}
                        title={q ? "Nothing matches" : "Empty queue"}
                        description={
                          q
                            ? `Nothing matches "${search}". Try shorter keywords.`
                            : "I need work to manage. Create a task from the Dashboard."
                        }
                      />
                    );
                  }
                  return filtered.map((t) => (
                    <View key={t._id} style={styles.taskCard}>
                      <View style={[styles.dot, { backgroundColor: t.projectColor }]} />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.taskTitle,
                            t.status === "completed" && styles.taskDone,
                          ]}
                        >
                          {t.title}
                        </Text>
                        <Text style={styles.taskMeta}>
                          {t.projectTitle} ·{" "}
                          {new Date(t.dueDate + "T00:00:00").toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" }
                          )}
                          {t.dueTime ? ` · ${t.dueTime}` : ""}
                        </Text>
                      </View>
                      {t.status === "completed" && (
                        <Ionicons name="checkmark-circle" size={20} color={colors.green} />
                      )}
                      {t.status === "overdue" && (
                        <Ionicons name="alert-circle" size={20} color={colors.red} />
                      )}
                    </View>
                  ));
                })()}
              </>
            ))}
        </ScrollView>
      )}

      <ProjectCreateSheet
        visible={projectSheetOpen}
        onClose={() => {
          setProjectSheetOpen(false);
          setEditingProject(null);
        }}
        editingProject={editingProject}
      />
    </SafeAreaView>
  );
}

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={56} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{description}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.emptyCta} onPress={onAction}>
          <Text style={styles.emptyCtaText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
  },
  title: { color: colors.text, fontSize: fontSize.xxl, fontWeight: "700" },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  segment: {
    flexDirection: "row",
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: borderRadius.sm,
  },
  segmentActive: { backgroundColor: colors.surfaceTertiary },
  segmentText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  segmentTextActive: { color: colors.text },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  projectCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  projectLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 22 },
  projectTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  projectSub: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%" },
  projectFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: "600" },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  taskTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "500" },
  taskDone: { textDecorationLine: "line-through", color: colors.textMuted },
  taskMeta: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyCta: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  emptyCtaText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: "700",
    letterSpacing: 1,
  },
  reorderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  reorderBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reorderArrows: { flexDirection: "row", gap: 4 },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowBtnDisabled: { opacity: 0.3 },
  searchWrap: { position: "relative" },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingLeft: 40,
    paddingRight: 40,
    paddingVertical: 12,
    color: colors.text,
    fontSize: fontSize.md,
  },
});
