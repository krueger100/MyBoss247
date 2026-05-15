import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Calendar } from "./Calendar";
import { colors, spacing, fontSize, borderRadius } from "../constants/theme";

type Timeframe = "yearly" | "quarterly" | "monthly" | "weekly" | "daily" | "milestone";

const TIMEFRAMES: { id: Timeframe; label: string; emoji: string }[] = [
  { id: "yearly", label: "Yearly", emoji: "📅" },
  { id: "quarterly", label: "Quarterly", emoji: "📆" },
  { id: "monthly", label: "Monthly", emoji: "🗓" },
  { id: "weekly", label: "Weekly", emoji: "📋" },
  { id: "daily", label: "Daily", emoji: "📝" },
  { id: "milestone", label: "Milestone", emoji: "🎯" },
];

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function dateToYMD(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function formatDate(ymd: string): string {
  return new Date(ymd + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function GoalCreateSheet({
  visible,
  onClose,
  projectId,
  parentGoalId,
  editingGoal,
}: {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  parentGoalId?: string;
  editingGoal?: {
    _id: string;
    title: string;
    description?: string;
    timeframe: Timeframe;
    startDate: string;
    dueDate: string;
  };
}) {
  const insets = useSafeAreaInsets();
  const createGoal = useMutation(api.goals.create);
  const updateGoal = useMutation(api.goals.update);
  const removeGoal = useMutation(api.goals.remove);
  const isEditing = !!editingGoal;

  const today = dateToYMD(new Date());
  const yearEnd = `${new Date().getFullYear()}-12-31`;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeframe, setTimeframe] = useState<Timeframe>("monthly");
  const [startDate, setStartDate] = useState(today);
  const [dueDate, setDueDate] = useState(yearEnd);
  const [loading, setLoading] = useState(false);
  const [startCalOpen, setStartCalOpen] = useState(false);
  const [endCalOpen, setEndCalOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editingGoal) {
      setTitle(editingGoal.title);
      setDescription(editingGoal.description ?? "");
      setTimeframe(editingGoal.timeframe);
      setStartDate(editingGoal.startDate);
      setDueDate(editingGoal.dueDate);
    } else {
      setTitle("");
      setDescription("");
      setTimeframe("monthly");
      setStartDate(today);
      setDueDate(yearEnd);
      setStartCalOpen(false);
      setEndCalOpen(false);
    }
  }, [visible, editingGoal]);

  const onSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Missing title", "Give the goal a name.");
      return;
    }
    if (dueDate <= startDate) {
      Alert.alert("Invalid dates", "Due date must be after start date.");
      return;
    }
    setLoading(true);
    try {
      if (isEditing && editingGoal) {
        await updateGoal({
          goalId: editingGoal._id as Id<"goals">,
          title: title.trim(),
          description: description.trim() || undefined,
          startDate,
          dueDate,
        });
      } else {
        await createGoal({
          projectId: projectId as Id<"projects">,
          title: title.trim(),
          description: description.trim() || undefined,
          timeframe,
          startDate,
          dueDate,
          parentGoalId: parentGoalId as Id<"goals"> | undefined,
        });
      }
      onClose();
    } catch (err: any) {
      Alert.alert("Failed", err?.message ?? "Couldn't save goal.");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = () => {
    if (!editingGoal) return;
    Alert.alert(
      "Delete goal?",
      "Child goals and tasks will be unlinked but kept.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await removeGoal({ goalId: editingGoal._id as Id<"goals"> });
              onClose();
            } catch (err: any) {
              Alert.alert("Failed", err?.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={loading ? undefined : onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>
              {isEditing ? "Edit Goal" : "New Goal"}
            </Text>
            <TouchableOpacity
              onPress={onSubmit}
              disabled={loading || !title.trim()}
              hitSlop={10}
            >
              {loading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text
                  style={[styles.saveBtn, !title.trim() && styles.saveBtnDisabled]}
                >
                  {isEditing ? "Save" : "Create"}
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
              <Text style={styles.label}>GOAL TITLE *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Hit $1M ARR, Launch v2, Close 50 customers"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
                autoFocus
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Why this goal? Success criteria?"
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>

            {!isEditing && (
              <View style={styles.section}>
                <Text style={styles.label}>TIMEFRAME</Text>
                <View style={styles.timeframeGrid}>
                  {TIMEFRAMES.map((tf) => {
                    const active = timeframe === tf.id;
                    return (
                      <TouchableOpacity
                        key={tf.id}
                        style={[
                          styles.timeframeChip,
                          active && styles.timeframeChipActive,
                        ]}
                        onPress={() => setTimeframe(tf.id)}
                      >
                        <Text style={styles.timeframeEmoji}>{tf.emoji}</Text>
                        <Text
                          style={[
                            styles.timeframeText,
                            active && { color: colors.primary, fontWeight: "700" },
                          ]}
                        >
                          {tf.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.label}>START DATE</Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setStartCalOpen((v) => !v)}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.dateBtnText}>{formatDate(startDate)}</Text>
                <Ionicons
                  name={startCalOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
              {startCalOpen && (
                <Calendar
                  value={startDate}
                  onChange={(d) => {
                    setStartDate(d);
                    if (d >= dueDate) {
                      const next = new Date(d + "T00:00:00");
                      next.setMonth(next.getMonth() + 1);
                      setDueDate(dateToYMD(next));
                    }
                    setStartCalOpen(false);
                  }}
                />
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>DUE DATE</Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setEndCalOpen((v) => !v)}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.dateBtnText}>{formatDate(dueDate)}</Text>
                <Ionicons
                  name={endCalOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
              {endCalOpen && (
                <Calendar
                  value={dueDate}
                  onChange={(d) => {
                    setDueDate(d);
                    setEndCalOpen(false);
                  }}
                  minDate={startDate}
                />
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                (!title.trim() || loading) && { opacity: 0.5 },
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
                  <Text style={styles.confirmText}>
                    {isEditing ? "Save Changes" : "Create Goal"}
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
                <Text style={styles.deleteText}>Delete Goal</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
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
  saveBtn: { color: colors.primary, fontSize: fontSize.md, fontWeight: "700" },
  saveBtnDisabled: { color: colors.textMuted },
  content: { gap: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  section: { gap: spacing.sm },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  textarea: { minHeight: 60, textAlignVertical: "top" },
  timeframeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  timeframeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  timeframeChipActive: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderColor: colors.primary,
  },
  timeframeEmoji: { fontSize: 16 },
  timeframeText: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
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
  confirmText: {
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
  deleteText: { color: colors.red, fontSize: fontSize.md, fontWeight: "700" },
});
