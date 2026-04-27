import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "../../convex/_generated/api";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

type Personality = "drill_sergeant" | "tough_coach" | "supportive_manager";

const PERSONALITIES: {
  id: Personality;
  emoji: string;
  name: string;
  tagline: string;
}[] = [
  {
    id: "drill_sergeant",
    emoji: "🪖",
    name: "Drill Sergeant",
    tagline: "Aggressive. Zero tolerance. Military-style.",
  },
  {
    id: "tough_coach",
    emoji: "💪",
    name: "Tough Coach",
    tagline: "Firm but fair. Results-focused.",
  },
  {
    id: "supportive_manager",
    emoji: "🤝",
    name: "Supportive Manager",
    tagline: "Encouraging. Empathetic. Still holds you accountable.",
  },
];

export default function QuickStartScreen() {
  const router = useRouter();
  const updateUser = useMutation(api.users.updateUser);
  const createProject = useMutation(api.projects.create);
  const createTask = useMutation(api.tasks.create);

  const [projectName, setProjectName] = useState("");
  const [annualPotential, setAnnualPotential] = useState("");
  const [personality, setPersonality] = useState<Personality>("tough_coach");
  const [loading, setLoading] = useState(false);

  const dailyValue = (() => {
    const n = parseFloat(annualPotential.replace(/[^\d.]/g, ""));
    if (!n || isNaN(n)) return 0;
    return Math.round(n / 365);
  })();

  const todayStr = new Date().toISOString().split("T")[0];

  const onContinue = async () => {
    if (!projectName.trim() || !annualPotential || dailyValue === 0) {
      Alert.alert("Missing info", "Fill in your project name and annual potential.");
      return;
    }
    setLoading(true);
    try {
      const annual = parseFloat(annualPotential.replace(/[^\d.]/g, ""));

      // Create the first project
      const projectId = await createProject({
        title: projectName.trim(),
        annualPotential: annual,
      });

      // Seed 3 starter tasks (placeholder until OpenAI is wired)
      const starterTasks = [
        { title: "Define your #1 priority for this project", dueTime: "10:00" },
        { title: "Block 90 mins of deep work today", dueTime: "14:00" },
        { title: "Review progress and plan tomorrow", dueTime: "18:00" },
      ];
      await Promise.all(
        starterTasks.map((t) =>
          createTask({
            projectId,
            title: t.title,
            dueDate: todayStr,
            dueTime: t.dueTime,
            priority: "medium",
          })
        )
      );

      // TODO: also persist Boss personality to user.bossSettings
      await updateUser({ onboardingStep: "done" });
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.step}>QUICK START · STEP 1 OF 1</Text>
        <Text style={styles.title}>Let's set you up.</Text>
        <Text style={styles.sub}>
          60 seconds. Then your first day begins.
        </Text>

        <View style={styles.section}>
          <Text style={styles.label}>YOUR FIRST PROJECT</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. SaaS App, Consulting Biz, Indie Game"
            placeholderTextColor={colors.textMuted}
            value={projectName}
            onChangeText={setProjectName}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>ANNUAL EARNING POTENTIAL</Text>
          <Text style={styles.help}>
            What could this project realistically earn per year if you execute?
          </Text>
          <View style={styles.currencyInput}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={[styles.input, styles.inputCurrency]}
              placeholder="10,000,000"
              placeholderTextColor={colors.textMuted}
              value={annualPotential}
              onChangeText={(v) => setAnnualPotential(v.replace(/[^\d,]/g, ""))}
              keyboardType="number-pad"
            />
          </View>
          {dailyValue > 0 && (
            <Text style={styles.dailyValue}>
              = ${dailyValue.toLocaleString()}/day at stake
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>PICK YOUR BOSS</Text>
          <View style={{ gap: spacing.sm }}>
            {PERSONALITIES.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.personalityCard,
                  personality === p.id && styles.personalityActive,
                ]}
                onPress={() => setPersonality(p.id)}
              >
                <Text style={styles.personalityEmoji}>{p.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personalityName}>{p.name}</Text>
                  <Text style={styles.personalityTagline}>{p.tagline}</Text>
                </View>
                {personality === p.id && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.cta, loading && { opacity: 0.6 }]}
          onPress={onContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.ctaText}>CLOCK IN</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  step: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: spacing.lg,
  },
  title: { color: colors.text, fontSize: fontSize.xxl, fontWeight: "800" },
  sub: { color: colors.textSecondary, fontSize: fontSize.md, marginTop: -8 },
  section: { gap: spacing.sm },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  help: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: -2 },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
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
    marginTop: 4,
  },
  personalityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  personalityActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
  },
  personalityEmoji: { fontSize: 28 },
  personalityName: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  personalityTagline: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  cta: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  ctaText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: "800",
    letterSpacing: 2,
  },
});
