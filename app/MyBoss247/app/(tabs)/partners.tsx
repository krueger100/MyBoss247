import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

export default function PartnersScreen() {
  const onInvite = () => {
    Alert.alert("Coming soon", "Partner invitations will arrive in Phase 6.");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Partners</Text>
        <TouchableOpacity style={styles.addBtn} onPress={onInvite}>
          <Ionicons name="person-add" size={18} color={colors.background} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.vipBanner} onPress={onInvite}>
          <View style={styles.vipBadge}>
            <Ionicons name="diamond" size={14} color="#FFD700" />
            <Text style={styles.vipBadgeText}>VIP HIGH STAKES</Text>
          </View>
          <Text style={styles.vipTitle}>$5,000+ milestone duels</Text>
          <Text style={styles.vipSub}>
            Real money. Real verifiers. For serious operators only.
          </Text>
        </TouchableOpacity>

        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No partners yet</Text>
          <Text style={styles.emptyText}>
            Invite an entrepreneur to keep you accountable. Compete in challenges
            and put real money on the line.
          </Text>
          <TouchableOpacity style={styles.emptyCta} onPress={onInvite}>
            <Text style={styles.emptyCtaText}>Invite a Partner</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  vipBanner: {
    backgroundColor: "#1a1208",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  vipBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  vipBadgeText: {
    color: "#FFD700",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  vipTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  vipSub: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 4 },
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
});
