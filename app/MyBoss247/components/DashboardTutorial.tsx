import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, spacing, fontSize, borderRadius } from "../constants/theme";

const SEEN_KEY = "boss-mode:tutorial-seen-v1";

const STEPS: {
  emoji: string;
  title: string;
  body: string;
}[] = [
  {
    emoji: "📋",
    title: "Welcome to Boss Mode",
    body: "You're the employee. The app is your boss. I assign you tasks. I check in. I escalate when you slip. The point is to make every day count.",
  },
  {
    emoji: "💰",
    title: "Your time is money",
    body: "The big number at the top is what today is worth — your projects' combined daily earning potential. Captured (green) goes up as you complete tasks. Slipping (red) goes up as the day goes by.",
  },
  {
    emoji: "😐",
    title: "I watch your mood",
    body: "The badge in the top right shows my mood, based on your warning levels. Green means on track. Red means we have a problem.",
  },
  {
    emoji: "📥",
    title: "Check-ins arrive throughout the day",
    body: "Yellow cards on your Dashboard are pending check-ins. Tap one — tick off tasks, write your report, submit. I'll be watching.",
  },
  {
    emoji: "✨",
    title: "Test it now",
    body: "Tap the 'Test ✨' button next to 'Your Tasks' to fire a check-in immediately. Use it to see how the system works.",
  },
];

export function DashboardTutorial() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY).then((seen) => {
      if (!seen) setVisible(true);
    });
  }, []);

  const close = async () => {
    setVisible(false);
    await AsyncStorage.setItem(SEEN_KEY, "1");
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      close();
    }
  };

  const current = STEPS[step];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.backdrop, { paddingTop: insets.top }]}>
        <View style={styles.card}>
          <View style={styles.skipRow}>
            <TouchableOpacity onPress={close} hitSlop={10}>
              <Text style={styles.skip}>Skip</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.emoji}>{current.emoji}</Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>

          {/* Step dots */}
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === step && styles.dotActive]}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.cta} onPress={next}>
            <Text style={styles.ctaText}>
              {step === STEPS.length - 1 ? "Let's Go" : "Next"}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={colors.background}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.md,
  },
  skipRow: { alignSelf: "flex-end" },
  skip: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "600" },
  emoji: { fontSize: 56, marginBottom: spacing.sm },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: "800",
    textAlign: "center",
  },
  body: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: "center",
    lineHeight: 22,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginTop: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceTertiary,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  ctaText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
