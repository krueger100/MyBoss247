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
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { colors, spacing, fontSize, borderRadius } from "../constants/theme";

const TYPE_LABELS: Record<string, string> = {
  morning: "Morning Brief",
  midday: "Midday Check",
  afternoon: "Afternoon Push",
  evening: "End of Day Review",
  warning: "Warning",
  inbox: "Boss Inbox",
};

export function CheckInSheet({
  visible,
  checkIn,
  onClose,
}: {
  visible: boolean;
  checkIn: {
    _id: string;
    bossMessage: string;
    checkInType: string;
    _creationTime: number;
  } | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const respond = useMutation(api.checkIns.respond);

  const todayStr = new Date().toISOString().split("T")[0];
  const todaysTasks = useQuery(
    api.tasks.today,
    visible ? { dueDate: todayStr } : "skip"
  );

  const [response, setResponse] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setResponse("");
      setSelected(new Set());
    }
  }, [visible, checkIn?._id]);

  if (!checkIn) return null;

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const onSubmit = async () => {
    if (!response.trim() && selected.size === 0) {
      Alert.alert(
        "Empty response",
        "Either mark tasks done or write something to the Boss."
      );
      return;
    }
    setSubmitting(true);
    try {
      await respond({
        checkInId: checkIn._id as Id<"checkIns">,
        response: response.trim(),
        completedTaskIds: Array.from(selected) as Id<"tasks">[],
      });
      onClose();
    } catch (err: any) {
      Alert.alert("Failed", err?.message || "Couldn't submit response.");
    } finally {
      setSubmitting(false);
    }
  };

  const pendingTasks = (todaysTasks ?? []).filter(
    (t) => t.status !== "completed"
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={submitting ? undefined : onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.bossAvatar}>
                <Text style={styles.bossAvatarText}>B</Text>
              </View>
              <View>
                <Text style={styles.title}>The Boss</Text>
                <Text style={styles.subtitle}>{TYPE_LABELS[checkIn.checkInType]}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10} disabled={submitting}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Boss message */}
            <View style={styles.bossMsg}>
              <Text style={styles.bossMsgText}>{checkIn.bossMessage}</Text>
            </View>

            {/* Tasks to check off */}
            {pendingTasks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.label}>MARK AS DONE</Text>
                {pendingTasks.map((t) => {
                  const isSel = selected.has(t._id);
                  return (
                    <TouchableOpacity
                      key={t._id}
                      style={[styles.taskRow, isSel && styles.taskRowActive]}
                      onPress={() => toggle(t._id)}
                    >
                      <View
                        style={[styles.checkbox, isSel && styles.checkboxChecked]}
                      >
                        {isSel && (
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color={colors.background}
                          />
                        )}
                      </View>
                      <Text
                        style={[styles.taskTitle, isSel && styles.taskTitleSel]}
                      >
                        {t.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Response */}
            <View style={styles.section}>
              <Text style={styles.label}>YOUR REPORT (OPTIONAL)</Text>
              <TextInput
                style={styles.responseInput}
                placeholder="Explain blockers, progress, what's next..."
                placeholderTextColor={colors.textMuted}
                value={response}
                onChangeText={setResponse}
                multiline
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                submitting && styles.submitBtnDisabled,
              ]}
              onPress={onSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <>
                  <Ionicons name="send" size={18} color={colors.background} />
                  <Text style={styles.submitBtnText}>Submit Report</Text>
                </>
              )}
            </TouchableOpacity>
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
    maxHeight: "85%",
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  bossAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  bossAvatarText: { color: colors.primary, fontSize: fontSize.md, fontWeight: "800" },
  title: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  subtitle: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  content: { paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.lg },
  bossMsg: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  bossMsgText: { color: colors.text, fontSize: fontSize.md, lineHeight: 22 },
  section: { gap: spacing.sm },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskRowActive: { backgroundColor: "rgba(34, 197, 94, 0.08)", borderColor: colors.primary },
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
  taskTitle: { flex: 1, color: colors.text, fontSize: fontSize.md, fontWeight: "500" },
  taskTitleSel: { color: colors.primary, fontWeight: "600" },
  responseInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    minHeight: 100,
    textAlignVertical: "top",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
