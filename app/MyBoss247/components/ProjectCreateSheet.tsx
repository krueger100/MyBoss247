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
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { colors, spacing, fontSize, borderRadius } from "../constants/theme";

const PALETTE = [
  "#22C55E",
  "#F97316",
  "#8B5CF6",
  "#3B82F6",
  "#EC4899",
  "#EAB308",
  "#06B6D4",
  "#EF4444",
];

const ICONS = ["💼", "💻", "✉️", "📱", "🎨", "🚀", "📊", "🛒", "🎮", "🎵", "📚", "💡"];

export function ProjectCreateSheet({
  visible,
  onClose,
  editingProject,
}: {
  visible: boolean;
  onClose: () => void;
  editingProject?: {
    _id: string;
    title: string;
    description?: string;
    icon: string;
    colour: string;
    annualPotential: number;
  };
}) {
  const insets = useSafeAreaInsets();
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const archiveProject = useMutation(api.projects.archive);
  const isEditing = !!editingProject;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("💼");
  const [colour, setColour] = useState(PALETTE[0]);
  const [potentialAmount, setPotentialAmount] = useState("");
  const [period, setPeriod] = useState<"annual" | "monthly">("annual");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editingProject) {
      setTitle(editingProject.title);
      setDescription(editingProject.description ?? "");
      setIcon(editingProject.icon);
      setColour(editingProject.colour);
      setPotentialAmount(String(editingProject.annualPotential));
      setPeriod("annual");
    } else {
      setTitle("");
      setDescription("");
      setIcon("💼");
      setColour(PALETTE[0]);
      setPotentialAmount("");
      setPeriod("annual");
    }
  }, [visible, editingProject]);

  const annualNumber = (() => {
    const n = parseFloat(potentialAmount.replace(/[^\d.]/g, ""));
    if (!n || isNaN(n)) return 0;
    return period === "monthly" ? n * 12 : n;
  })();

  const onSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Missing title", "Give the project a name.");
      return;
    }
    if (annualNumber <= 0) {
      Alert.alert("Missing potential", "Enter the earning potential.");
      return;
    }
    setLoading(true);
    try {
      if (isEditing && editingProject) {
        await updateProject({
          projectId: editingProject._id as Id<"projects">,
          title: title.trim(),
          description: description.trim() || undefined,
          icon,
          colour,
          annualPotential: annualNumber,
        });
      } else {
        await createProject({
          title: title.trim(),
          description: description.trim() || undefined,
          icon,
          colour,
          annualPotential: annualNumber,
        });
      }
      onClose();
    } catch (err: any) {
      Alert.alert("Failed", err?.message || "Couldn't save project.");
    } finally {
      setLoading(false);
    }
  };

  const onArchive = () => {
    if (!editingProject) return;
    Alert.alert(
      "Archive project?",
      "It will be hidden from your active list. Tasks remain in history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await archiveProject({
                projectId: editingProject._id as Id<"projects">,
              });
              onClose();
            } catch (err: any) {
              Alert.alert("Failed", err?.message || "Couldn't archive.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const dailyValue =
    annualNumber > 0 ? Math.round(annualNumber / 365) : 0;

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
              {isEditing ? "Edit Project" : "New Project"}
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
                  style={[
                    styles.saveBtn,
                    !title.trim() && styles.saveBtnDisabled,
                  ]}
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
              <Text style={styles.label}>PROJECT NAME *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. SaaS App, Consulting Biz"
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
                placeholder="What is this project about?"
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>ICON</Text>
              <View style={styles.iconGrid}>
                {ICONS.map((i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.iconBtn,
                      icon === i && { borderColor: colour, backgroundColor: colour + "20" },
                    ]}
                    onPress={() => setIcon(i)}
                  >
                    <Text style={styles.iconText}>{i}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>COLOR</Text>
              <View style={styles.colorRow}>
                {PALETTE.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: c },
                      colour === c && styles.colorSwatchActive,
                    ]}
                    onPress={() => setColour(c)}
                  >
                    {colour === c && (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>EARNING POTENTIAL *</Text>
              <View style={styles.periodToggle}>
                <TouchableOpacity
                  style={[
                    styles.periodBtn,
                    period === "annual" && styles.periodBtnActive,
                  ]}
                  onPress={() => setPeriod("annual")}
                >
                  <Text
                    style={[
                      styles.periodText,
                      period === "annual" && styles.periodTextActive,
                    ]}
                  >
                    Per Year
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.periodBtn,
                    period === "monthly" && styles.periodBtnActive,
                  ]}
                  onPress={() => setPeriod("monthly")}
                >
                  <Text
                    style={[
                      styles.periodText,
                      period === "monthly" && styles.periodTextActive,
                    ]}
                  >
                    Per Month
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.currencyInput}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={[styles.input, styles.inputCurrency]}
                  placeholder={period === "annual" ? "10,000,000" : "100,000"}
                  placeholderTextColor={colors.textMuted}
                  value={potentialAmount}
                  onChangeText={(v) => setPotentialAmount(v.replace(/[^\d,]/g, ""))}
                  keyboardType="number-pad"
                />
              </View>
              {dailyValue > 0 && (
                <Text style={styles.dailyValue}>
                  = ${dailyValue.toLocaleString()}/day at stake
                </Text>
              )}
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
                  <Ionicons name="checkmark-circle" size={20} color={colors.background} />
                  <Text style={styles.confirmBtnText}>
                    {isEditing ? "Save Changes" : "Create Project"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {isEditing && (
              <TouchableOpacity
                style={styles.archiveBtn}
                onPress={onArchive}
                disabled={loading}
              >
                <Ionicons name="archive-outline" size={18} color={colors.red} />
                <Text style={styles.archiveBtnText}>Archive Project</Text>
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
  saveBtn: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
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
    color: colors.text,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  textarea: { minHeight: 60, textAlignVertical: "top" },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 24 },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  colorSwatchActive: { borderWidth: 2, borderColor: colors.text },
  periodToggle: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 4,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: borderRadius.sm,
  },
  periodBtnActive: { backgroundColor: colors.surfaceTertiary },
  periodText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  periodTextActive: { color: colors.text },
  currencyInput: { position: "relative" },
  currencySymbol: {
    position: "absolute",
    left: spacing.md,
    top: 14,
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: "600",
    zIndex: 1,
  },
  inputCurrency: { paddingLeft: 32 },
  dailyValue: {
    color: colors.green,
    fontSize: fontSize.sm,
    fontWeight: "700",
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
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: "800",
    letterSpacing: 1,
  },
  archiveBtn: {
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
  archiveBtnText: { color: colors.red, fontSize: fontSize.md, fontWeight: "700" },
});
