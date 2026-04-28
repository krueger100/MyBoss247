import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

const PERSONALITY_LABELS: Record<string, string> = {
  drill_sergeant: "Drill Sergeant",
  tough_coach: "Tough Coach",
  supportive_manager: "Supportive Manager",
};

export default function ChatScreen() {
  const user = useCurrentUser();
  const personality = user?.bossSettings?.personality
    ? PERSONALITY_LABELS[user.bossSettings.personality]
    : "Loading...";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.bossAvatar}>
            <Text style={styles.bossAvatarText}>B</Text>
          </View>
          <View>
            <Text style={styles.title}>The Boss</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{personality} · Standby</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.emptyState}>
        <Ionicons name="chatbubbles-outline" size={56} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>Boss Chat is offline</Text>
        <Text style={styles.emptyText}>
          The AI Boss isn't wired up yet. Once OpenAI is connected, you'll be
          able to chat, get check-ins, and explain your blockers in character.
        </Text>
        <TouchableOpacity
          style={styles.emptyCta}
          onPress={() =>
            Alert.alert(
              "Coming soon",
              "AI Boss Chat will be wired in Phase 4 (OpenAI + Convex actions)."
            )
          }
        >
          <Text style={styles.emptyCtaText}>Notify Me</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
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
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted },
  statusText: { color: colors.textMuted, fontSize: fontSize.xs },
  emptyState: {
    flex: 1,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  emptyCtaText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
});
