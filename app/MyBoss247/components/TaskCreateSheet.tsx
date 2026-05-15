import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Calendar } from "./Calendar";
import { colors, spacing, fontSize, borderRadius } from "../constants/theme";

type Priority = "high" | "medium" | "low";

const PRIORITIES: { id: Priority; label: string; color: string }[] = [
  { id: "high", label: "High", color: colors.red },
  { id: "medium", label: "Medium", color: colors.yellow },
  { id: "low", label: "Low", color: colors.textMuted },
];

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function dateToYMD(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateLabel(ymd: string): string {
  const today = dateToYMD(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowYmd = dateToYMD(tomorrow);
  if (ymd === today) return "Today";
  if (ymd === tomorrowYmd) return "Tomorrow";
  const d = new Date(ymd + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function format12h(hm: string): string {
  const [hStr, mStr] = hm.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return hm;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${period}`;
}

export function TaskCreateSheet({
  visible,
  onClose,
  defaultProjectId,
  editingTask,
}: {
  visible: boolean;
  onClose: () => void;
  defaultProjectId?: string;
  editingTask?: {
    _id: string;
    title: string;
    description?: string;
    projectId: string;
    dueDate: string;
    dueTime?: string;
    priority: Priority;
  };
}) {
  const insets = useSafeAreaInsets();
  const projects = useQuery(api.projects.list);
  const challenges = useQuery(api.challenges.list);
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const removeTask = useMutation(api.tasks.remove);
  const isEditing = !!editingTask;

  // Filter challenges to active ones I'm participating in
  const activeChallenges = (challenges ?? []).filter(
    (c) => c?.status === "active"
  );

  const [title, setTitle] = useState(editingTask?.title ?? "");
  const [description, setDescription] = useState(editingTask?.description ?? "");
  const [projectId, setProjectId] = useState<string | undefined>(
    editingTask?.projectId ?? defaultProjectId
  );
  const [dueDate, setDueDate] = useState<string>(
    editingTask?.dueDate ?? dateToYMD(new Date())
  );
  const [dueTime, setDueTime] = useState<string | undefined>(
    editingTask?.dueTime
  );
  const [priority, setPriority] = useState<Priority>(
    editingTask?.priority ?? "medium"
  );
  const [loading, setLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [hourInput, setHourInput] = useState("");
  const [minuteInput, setMinuteInput] = useState("");
  const [periodInput, setPeriodInput] = useState<"AM" | "PM">("AM");
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [selectedChallenges, setSelectedChallenges] = useState<Set<string>>(new Set());
  const [repeat, setRepeat] = useState<
    "off" | "daily" | "weekdays" | "weekly" | "monthly"
  >("off");

  const reset = () => {
    setTitle("");
    setDescription("");
    setProjectId(defaultProjectId);
    setDueDate(dateToYMD(new Date()));
    setDueTime(undefined);
    setPriority("medium");
    setCalendarOpen(false);
    setHourInput("");
    setMinuteInput("");
    setPeriodInput("AM");
    setShowCustomTime(false);
    setSelectedChallenges(new Set());
    setRepeat("off");
  };

  // When opening for edit, hydrate from editingTask; for create, reset.
  useEffect(() => {
    if (!visible) return;
    if (editingTask) {
      setTitle(editingTask.title ?? "");
      setDescription(editingTask.description ?? "");
      setProjectId(editingTask.projectId);
      setDueDate(editingTask.dueDate);
      setDueTime(editingTask.dueTime);
      setPriority(editingTask.priority);
    } else {
      reset();
    }
  }, [visible, editingTask]);

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const effectiveProjectId =
    projectId ?? (projects && projects[0]?._id) ?? undefined;

  const applyManualTime = (period?: "AM" | "PM") => {
    const p = period ?? periodInput;
    const h = parseInt(hourInput, 10);
    const m = parseInt(minuteInput || "0", 10);
    if (isNaN(h) || h < 1 || h > 12 || isNaN(m) || m < 0 || m > 59) return;
    let h24 = h % 12;
    if (p === "PM") h24 += 12;
    setDueTime(`${pad(h24)}:${pad(m)}`);
  };

  const onSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Missing title", "Give the task a name.");
      return;
    }
    if (!effectiveProjectId) {
      Alert.alert("No project", "Create a project first.");
      return;
    }
    setLoading(true);
    try {
      if (isEditing && editingTask) {
        await updateTask({
          taskId: editingTask._id as Id<"tasks">,
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate,
          dueTime,
          priority,
        });
      } else {
        const recurrenceRule =
          repeat === "off"
            ? undefined
            : repeat === "weekly"
              ? {
                  frequency: "weekly" as const,
                  daysOfWeek: [new Date(dueDate + "T00:00:00").getDay()],
                }
              : repeat === "monthly"
                ? {
                    frequency: "monthly" as const,
                    dayOfMonth: new Date(dueDate + "T00:00:00").getDate(),
                  }
                : repeat === "weekdays"
                  ? { frequency: "weekdays" as const }
                  : { frequency: "daily" as const };

        await createTask({
          projectId: effectiveProjectId as Id<"projects">,
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate,
          dueTime,
          priority,
          isRecurring: repeat !== "off",
          recurrenceRule,
          addToChallenges:
            selectedChallenges.size > 0
              ? (Array.from(selectedChallenges) as Id<"challenges">[])
              : undefined,
        });
      }
      reset();
      onClose();
    } catch (err: any) {
      Alert.alert("Failed", err?.message || "Couldn't save task.");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = () => {
    if (!editingTask) return;
    Alert.alert("Delete task?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            await removeTask({ taskId: editingTask._id as Id<"tasks"> });
            reset();
            onClose();
          } catch (err: any) {
            Alert.alert("Failed", err?.message || "Couldn't delete.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const todayYmd = dateToYMD(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowYmd = dateToYMD(tomorrow);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekYmd = dateToYMD(nextWeek);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={handleClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>{isEditing ? "Edit Task" : "New Task"}</Text>
            <TouchableOpacity
              onPress={onSubmit}
              disabled={loading || !title.trim()}
              hitSlop={10}
            >
              {loading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text
                  style={[
                    styles.saveBtn,
                    !title.trim() && styles.saveBtnDisabled,
                  ]}
                >
                  {isEditing ? "Save" : "Add"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.label}>TASK TITLE *</Text>
              <TextInput
                style={styles.titleInput}
                placeholder="What needs to ship?"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
                autoFocus
                multiline
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>DETAILS (OPTIONAL)</Text>
              <TextInput
                style={styles.descInput}
                placeholder="Add notes, context, links..."
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>PROJECT</Text>
              {projects === undefined ? (
                <ActivityIndicator color={colors.primary} />
              ) : projects.length === 0 ? (
                <Text style={styles.noProjects}>
                  Create a project first.
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  {projects.map((p) => {
                    const active = p._id === effectiveProjectId;
                    return (
                      <TouchableOpacity
                        key={p._id}
                        style={[
                          styles.projectChip,
                          active && {
                            backgroundColor: p.colour + "20",
                            borderColor: p.colour,
                          },
                        ]}
                        onPress={() => setProjectId(p._id)}
                      >
                        <Text style={styles.projectIcon}>{p.icon}</Text>
                        <Text
                          style={[
                            styles.projectChipText,
                            active && { color: p.colour },
                          ]}
                        >
                          {p.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>DUE DATE</Text>
              <View style={styles.chipRow}>
                <DateChip
                  label="Today"
                  active={dueDate === todayYmd}
                  onPress={() => setDueDate(todayYmd)}
                />
                <DateChip
                  label="Tomorrow"
                  active={dueDate === tomorrowYmd}
                  onPress={() => setDueDate(tomorrowYmd)}
                />
                <DateChip
                  label="Next Week"
                  active={dueDate === nextWeekYmd}
                  onPress={() => setDueDate(nextWeekYmd)}
                />
              </View>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setCalendarOpen((v) => !v)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text style={styles.dateBtnText}>{formatDateLabel(dueDate)}</Text>
                <Ionicons
                  name={calendarOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
              {calendarOpen && (
                <Calendar
                  value={dueDate}
                  onChange={(d) => {
                    setDueDate(d);
                    setCalendarOpen(false);
                  }}
                  minDate={todayYmd}
                />
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>DUE TIME (OPTIONAL)</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.dateChip, !dueTime && styles.dateChipActive]}
                  onPress={() => {
                    setDueTime(undefined);
                    setShowCustomTime(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dateChipText,
                      !dueTime && { color: colors.primary, fontWeight: "700" },
                    ]}
                  >
                    No time
                  </Text>
                </TouchableOpacity>
                {["09:00", "12:00", "15:00", "18:00"].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.dateChip,
                      dueTime === t &&
                        !showCustomTime &&
                        styles.dateChipActive,
                    ]}
                    onPress={() => {
                      setDueTime(t);
                      setShowCustomTime(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dateChipText,
                        dueTime === t &&
                          !showCustomTime && {
                            color: colors.primary,
                            fontWeight: "700",
                          },
                      ]}
                    >
                      {format12h(t)}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.dateChip,
                    showCustomTime && styles.dateChipActive,
                  ]}
                  onPress={() => setShowCustomTime((v) => !v)}
                >
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={showCustomTime ? colors.primary : colors.text}
                  />
                  <Text
                    style={[
                      styles.dateChipText,
                      showCustomTime && {
                        color: colors.primary,
                        fontWeight: "700",
                      },
                    ]}
                  >
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>
              {dueTime && !showCustomTime && (
                <Text style={styles.customTimeHint}>
                  Selected: {format12h(dueTime)}
                </Text>
              )}

              {showCustomTime && (
                <View style={styles.customTimeRow}>
                  <TextInput
                    style={styles.hmInput}
                    placeholder="HH"
                    placeholderTextColor={colors.textMuted}
                    value={hourInput}
                    onChangeText={(v) =>
                      setHourInput(v.replace(/[^0-9]/g, "").slice(0, 2))
                    }
                    onBlur={() => applyManualTime()}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <Text style={styles.colon}>:</Text>
                  <TextInput
                    style={styles.hmInput}
                    placeholder="MM"
                    placeholderTextColor={colors.textMuted}
                    value={minuteInput}
                    onChangeText={(v) =>
                      setMinuteInput(v.replace(/[^0-9]/g, "").slice(0, 2))
                    }
                    onBlur={() => applyManualTime()}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <View style={styles.amPmToggle}>
                    {(["AM", "PM"] as const).map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.amPmBtn,
                          periodInput === p && styles.amPmBtnActive,
                        ]}
                        onPress={() => {
                          setPeriodInput(p);
                          applyManualTime(p);
                        }}
                      >
                        <Text
                          style={[
                            styles.amPmText,
                            periodInput === p && styles.amPmTextActive,
                          ]}
                        >
                          {p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Repeat */}
            {!isEditing && (
              <View style={styles.section}>
                <Text style={styles.label}>REPEAT</Text>
                <View style={styles.chipRow}>
                  {(
                    [
                      { id: "off", label: "Off" },
                      { id: "daily", label: "Daily" },
                      { id: "weekdays", label: "Weekdays" },
                      { id: "weekly", label: "Weekly" },
                      { id: "monthly", label: "Monthly" },
                    ] as const
                  ).map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[
                        styles.dateChip,
                        repeat === r.id && styles.dateChipActive,
                      ]}
                      onPress={() => setRepeat(r.id)}
                    >
                      <Text
                        style={[
                          styles.dateChipText,
                          repeat === r.id && { color: colors.primary, fontWeight: "700" },
                        ]}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {repeat !== "off" && (
                  <Text style={styles.customTimeHint}>
                    A new instance will be created when you complete this task.
                  </Text>
                )}
              </View>
            )}

            {/* Add to challenges (only for new tasks, only if active challenges exist) */}
            {!isEditing && activeChallenges.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.label}>COUNT TOWARD CHALLENGE</Text>
                <Text style={styles.help}>
                  Counts toward your % completion in selected challenges.
                </Text>
                <View style={styles.chipRow}>
                  {activeChallenges.map((c) => {
                    const sel = selectedChallenges.has(c!._id);
                    return (
                      <TouchableOpacity
                        key={c!._id}
                        style={[
                          styles.dateChip,
                          sel && styles.dateChipActive,
                        ]}
                        onPress={() => {
                          const next = new Set(selectedChallenges);
                          if (sel) next.delete(c!._id);
                          else next.add(c!._id);
                          setSelectedChallenges(next);
                        }}
                      >
                        <Ionicons
                          name={sel ? "trophy" : "trophy-outline"}
                          size={14}
                          color={sel ? colors.primary : colors.text}
                        />
                        <Text
                          style={[
                            styles.dateChipText,
                            sel && { color: colors.primary, fontWeight: "700" },
                          ]}
                        >
                          {c!.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.label}>PRIORITY</Text>
              <View style={styles.chipRow}>
                {PRIORITIES.map((p) => {
                  const active = p.id === priority;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.priorityChip,
                        active && {
                          backgroundColor: p.color + "20",
                          borderColor: p.color,
                        },
                      ]}
                      onPress={() => setPriority(p.id)}
                    >
                      <View
                        style={[styles.priorityDot, { backgroundColor: p.color }]}
                      />
                      <Text
                        style={[
                          styles.priorityText,
                          active && { color: p.color },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                (!title.trim() || loading) && styles.confirmBtnDisabled,
              ]}
              onPress={onSubmit}
              disabled={!title.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.background}
                  />
                  <Text style={styles.confirmBtnText}>
                    {isEditing ? "Save Changes" : "Add Task"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {isEditing && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={onDelete}
                disabled={loading}
              >
                <Ionicons name="trash-outline" size={18} color={colors.red} />
                <Text style={styles.deleteBtnText}>Delete Task</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function DateChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.dateChip, active && styles.dateChipActive]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.dateChipText,
          active && { color: colors.primary, fontWeight: "700" },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: "90%",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  saveBtn: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  saveBtnDisabled: { color: colors.textMuted },
  content: { gap: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  titleInput: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "600",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    minHeight: 52,
  },
  descInput: {
    color: colors.text,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    minHeight: 60,
    textAlignVertical: "top",
  },
  section: { gap: spacing.sm },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  noProjects: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontStyle: "italic",
  },
  chipRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  projectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  projectIcon: { fontSize: 16 },
  projectChipText: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dateChipActive: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderColor: colors.primary,
  },
  dateChipText: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  dateBtnText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  customTimeHint: {
    color: colors.green,
    fontSize: fontSize.xs,
    fontWeight: "600",
    marginTop: 2,
  },
  customTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  hmInput: {
    width: 64,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "700",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: "center",
  },
  colon: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  amPmToggle: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    marginLeft: spacing.md,
  },
  amPmBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
  },
  amPmBtnActive: { backgroundColor: colors.primary },
  amPmText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: "700",
  },
  amPmTextActive: { color: colors.background },
  priorityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  priorityText: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: "800",
    letterSpacing: 1,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.red,
    marginTop: spacing.sm,
  },
  deleteBtnText: {
    color: colors.red,
    fontSize: fontSize.md,
    fontWeight: "700",
  },
});
