import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

const FAQS = [
  {
    q: "How do penalties actually work?",
    a: "Every task has a deadline. If you miss it, after a grace period (default 24 hours), Stripe automatically charges your saved payment method. The money goes to your chosen charity or accountability partner — never to Boss Mode.",
  },
  {
    q: "What's the Opportunity Cost Clock?",
    a: "It's the daily value of your projects (annual potential ÷ 365). Every hour wasted without progress is real money slipping. It reframes 'time is money' as 'time IS your earning potential.'",
  },
  {
    q: "Can I change Boss personalities?",
    a: "Yes — Profile → Boss Settings. Drill Sergeant is the most aggressive, Supportive Manager is the gentlest. All three enforce penalties equally; only the tone changes.",
  },
  {
    q: "What's a Personal Day?",
    a: "A streak-protection day. Invoking one pauses all penalty triggers for that day and protects your current streak. You get 2 per month by default (configurable 0-5).",
  },
  {
    q: "How is my data used?",
    a: "Your task data, projects, and chat history stay private in our Convex database. The AI Boss (Claude) sees this context when generating responses but Anthropic doesn't store it.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Profile → Subscription → Cancel. Your data is preserved for 30 days, then deleted. Active penalties are settled before cancellation.",
  },
];

export default function HelpScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CONTACT</Text>
          <TouchableOpacity
            style={styles.card}
            onPress={() => Linking.openURL("mailto:support@bossmode.app")}
          >
            <Ionicons name="mail-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>Email Support</Text>
              <Text style={styles.cardSub}>support@bossmode.app</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FAQ</Text>
          {FAQS.map((f, i) => (
            <View key={i} style={styles.faqCard}>
              <Text style={styles.faqQ}>{f.q}</Text>
              <Text style={styles.faqA}>{f.a}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },
  section: { gap: spacing.sm },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  cardLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  cardSub: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 },
  faqCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  faqQ: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  faqA: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20 },
});
