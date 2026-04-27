import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

const MOCK_PARTNERS = [
  { id: "1", name: "Alex Chen", handle: "@alexc", streak: 18, completion: 94, avatar: "AC" },
  { id: "2", name: "Sam Rivera", handle: "@samr", streak: 6, completion: 71, avatar: "SR" },
];

const MOCK_CHALLENGES = [
  {
    id: "1",
    title: "Q2 Sprint",
    opponent: "Alex Chen",
    stake: 250,
    myProgress: 72,
    opponentProgress: 65,
    daysLeft: 4,
  },
];

export default function PartnersScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Partners</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Ionicons name="person-add" size={18} color={colors.background} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* VIP banner */}
        <TouchableOpacity style={styles.vipBanner}>
          <View style={styles.vipBadge}>
            <Ionicons name="diamond" size={14} color="#FFD700" />
            <Text style={styles.vipBadgeText}>VIP HIGH STAKES</Text>
          </View>
          <Text style={styles.vipTitle}>$5,000+ milestone duels</Text>
          <Text style={styles.vipSub}>
            Real money. Real verifiers. For serious operators only.
          </Text>
        </TouchableOpacity>

        {/* Active challenge */}
        <Text style={styles.sectionTitle}>Active Challenges</Text>
        {MOCK_CHALLENGES.map((c) => (
          <TouchableOpacity key={c.id} style={styles.challengeCard}>
            <View style={styles.challengeHeader}>
              <Text style={styles.challengeTitle}>{c.title}</Text>
              <Text style={styles.stake}>${c.stake}</Text>
            </View>
            <Text style={styles.challengeOpponent}>vs {c.opponent}</Text>

            <View style={styles.versusRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressName}>You</Text>
                  <Text style={[styles.progressPct, { color: colors.primary }]}>
                    {c.myProgress}%
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${c.myProgress}%`, backgroundColor: colors.primary },
                    ]}
                  />
                </View>
              </View>

              <View style={{ flex: 1, marginTop: spacing.sm }}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressName}>{c.opponent.split(" ")[0]}</Text>
                  <Text style={styles.progressPct}>{c.opponentProgress}%</Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${c.opponentProgress}%`, backgroundColor: colors.orange },
                    ]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.challengeFooter}>
              <Ionicons name="time-outline" size={14} color={colors.textMuted} />
              <Text style={styles.daysLeft}>{c.daysLeft} days left</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Partners */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Your Partners</Text>
          <TouchableOpacity>
            <Text style={styles.sectionAction}>+ Invite</Text>
          </TouchableOpacity>
        </View>
        {MOCK_PARTNERS.map((p) => (
          <TouchableOpacity key={p.id} style={styles.partnerCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{p.avatar}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.partnerName}>{p.name}</Text>
              <Text style={styles.partnerHandle}>{p.handle}</Text>
            </View>
            <View style={styles.partnerStats}>
              <Text style={styles.partnerStat}>🔥 {p.streak}</Text>
              <Text style={styles.partnerStat}>{p.completion}%</Text>
            </View>
          </TouchableOpacity>
        ))}
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
  vipBadgeText: { color: "#FFD700", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  vipTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  vipSub: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 4 },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  sectionAction: { color: colors.primary, fontSize: fontSize.sm, fontWeight: "600" },
  challengeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  challengeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  challengeTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  stake: { color: colors.primary, fontSize: fontSize.md, fontWeight: "700" },
  challengeOpponent: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 },
  versusRow: { marginTop: spacing.md },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressName: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: "600" },
  progressPct: { color: colors.text, fontSize: fontSize.xs, fontWeight: "700" },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%" },
  challengeFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.md,
  },
  daysLeft: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: "600" },
  partnerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.text, fontSize: fontSize.sm, fontWeight: "700" },
  partnerName: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  partnerHandle: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
  partnerStats: { flexDirection: "row", gap: spacing.md },
  partnerStat: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: "600" },
});
