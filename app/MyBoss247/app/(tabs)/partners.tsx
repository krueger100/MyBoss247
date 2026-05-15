import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { InvitePartnerSheet } from "../../components/InvitePartnerSheet";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

export default function PartnersScreen() {
  const router = useRouter();
  const partners = useQuery(api.partners.list);
  const challenges = useQuery(api.challenges.list);
  const acceptInvite = useMutation(api.partners.acceptInvite);
  const removePartnership = useMutation(api.partners.removePartnership);

  const [inviteOpen, setInviteOpen] = useState(false);

  const loading = partners === undefined || challenges === undefined;

  const incoming = (partners ?? []).filter((p) => p.isIncomingInvite);
  const outgoing = (partners ?? []).filter((p) => p.isOutgoingInvite);
  const active = (partners ?? []).filter((p) => p.status === "active");

  const onAccept = async (partnershipId: string) => {
    try {
      await acceptInvite({ partnershipId: partnershipId as Id<"partnerships"> });
    } catch (err: any) {
      Alert.alert("Failed", err?.message ?? "Couldn't accept.");
    }
  };

  const onDecline = async (partnershipId: string) => {
    Alert.alert("Decline invite?", "", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: async () => {
          try {
            await removePartnership({
              partnershipId: partnershipId as Id<"partnerships">,
            });
          } catch (err: any) {
            Alert.alert("Failed", err?.message);
          }
        },
      },
    ]);
  };

  const onRemove = async (partnershipId: string) => {
    Alert.alert("End partnership?", "All shared challenges remain in history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End",
        style: "destructive",
        onPress: async () => {
          try {
            await removePartnership({
              partnershipId: partnershipId as Id<"partnerships">,
            });
          } catch (err: any) {
            Alert.alert("Failed", err?.message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Partners</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setInviteOpen(true)}>
          <Ionicons name="person-add" size={18} color={colors.background} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* VIP banner */}
          <View style={styles.vipBanner}>
            <View style={styles.vipBadge}>
              <Ionicons name="diamond" size={14} color="#FFD700" />
              <Text style={styles.vipBadgeText}>VIP HIGH STAKES</Text>
            </View>
            <Text style={styles.vipTitle}>$5,000+ milestone duels</Text>
            <Text style={styles.vipSub}>
              Real money. Real verifiers. Coming with Stripe integration.
            </Text>
          </View>

          {/* Incoming invites */}
          {incoming.length > 0 && (
            <View style={{ gap: spacing.sm }}>
              <Text style={styles.sectionLabel}>INVITES · {incoming.length}</Text>
              {incoming.map((p) =>
                p.other ? (
                  <View key={p.partnershipId} style={styles.inviteCard}>
                    <Avatar name={p.other.displayName} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{p.other.displayName}</Text>
                      <Text style={styles.meta}>wants to partner with you</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => onAccept(p.partnershipId)}
                    >
                      <Text style={styles.acceptText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={() => onDecline(p.partnershipId)}
                    >
                      <Ionicons name="close" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ) : null
              )}
            </View>
          )}

          {/* Outgoing invites */}
          {outgoing.length > 0 && (
            <View style={{ gap: spacing.sm }}>
              <Text style={styles.sectionLabel}>SENT · {outgoing.length}</Text>
              {outgoing.map((p) =>
                p.other ? (
                  <View key={p.partnershipId} style={styles.row}>
                    <Avatar name={p.other.displayName} muted />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{p.other.displayName}</Text>
                      <Text style={styles.meta}>Pending acceptance</Text>
                    </View>
                    <TouchableOpacity onPress={() => onDecline(p.partnershipId)}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : null
              )}
            </View>
          )}

          {/* Active challenges */}
          {challenges && challenges.length > 0 && (
            <View style={{ gap: spacing.sm }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>ACTIVE CHALLENGES</Text>
                {active.length > 0 && (
                  <TouchableOpacity
                    onPress={() => router.push("/challenge/create")}
                  >
                    <Text style={styles.action}>+ New</Text>
                  </TouchableOpacity>
                )}
              </View>
              {challenges.map((c) => (
                <TouchableOpacity
                  key={c!._id}
                  style={styles.challengeCard}
                  onPress={() => router.push(`/challenge/${c!._id}`)}
                >
                  <View style={styles.challengeHeader}>
                    <Text style={styles.challengeTitle}>{c!.title}</Text>
                    <Text style={styles.stake}>${c!.stakeAmount}</Text>
                  </View>
                  {c!.participants.map((p, idx) => (
                    <View key={p.userId} style={{ marginTop: idx > 0 ? spacing.sm : spacing.md }}>
                      <View style={styles.progressRow}>
                        <Text style={styles.progressName}>
                          {p.isMe ? "You" : p.displayName}
                        </Text>
                        <Text
                          style={[
                            styles.progressPct,
                            p.isMe && { color: colors.primary },
                          ]}
                        >
                          {p.completionPercentage}%
                        </Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${p.completionPercentage}%`,
                              backgroundColor: p.isMe
                                ? colors.primary
                                : colors.orange,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                  <View style={styles.challengeFooter}>
                    <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.daysLeft}>
                      Ends{" "}
                      {new Date(c!.endDate + "T00:00:00").toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" }
                      )}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Active partners */}
          <View style={{ gap: spacing.sm }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>YOUR PARTNERS</Text>
              <TouchableOpacity onPress={() => setInviteOpen(true)}>
                <Text style={styles.action}>+ Invite</Text>
              </TouchableOpacity>
            </View>

            {active.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Working alone</Text>
                <Text style={styles.emptyText}>
                  You need a rival. People who let you slip aren't friends — they're
                  spectators. Invite someone who'll call you out.
                </Text>
                <TouchableOpacity
                  style={styles.emptyCta}
                  onPress={() => setInviteOpen(true)}
                >
                  <Text style={styles.emptyCtaText}>Invite a Partner</Text>
                </TouchableOpacity>
              </View>
            ) : (
              active.map((p) =>
                p.other ? (
                  <View key={p.partnershipId} style={styles.partnerCard}>
                    <Avatar name={p.other.displayName} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{p.other.displayName}</Text>
                      <Text style={styles.meta}>
                        🔥 {p.other.currentStreak} · best {p.other.longestStreak}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert(p.other!.displayName, "Choose an action", [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Start Challenge",
                            onPress: () =>
                              router.push(
                                `/challenge/create?opponentId=${p.other!._id}`
                              ),
                          },
                          {
                            text: "End partnership",
                            style: "destructive",
                            onPress: () => onRemove(p.partnershipId),
                          },
                        ])
                      }
                    >
                      <Ionicons
                        name="ellipsis-horizontal"
                        size={20}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                ) : null
              )
            )}
          </View>
        </ScrollView>
      )}

      <InvitePartnerSheet
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </SafeAreaView>
  );
}

function Avatar({ name, muted }: { name: string; muted?: boolean }) {
  return (
    <View
      style={[
        partnerAvatarStyles.avatar,
        muted && { borderColor: colors.border },
      ]}
    >
      <Text style={partnerAvatarStyles.text}>
        {name[0]?.toUpperCase() ?? "?"}
      </Text>
    </View>
  );
}

const partnerAvatarStyles = StyleSheet.create({
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  text: { color: colors.text, fontSize: fontSize.md, fontWeight: "800" },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  action: { color: colors.primary, fontSize: fontSize.sm, fontWeight: "600" },
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
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
  name: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  meta: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  acceptBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  acceptText: { color: colors.background, fontSize: fontSize.sm, fontWeight: "700" },
  declineBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: colors.red, fontSize: fontSize.sm, fontWeight: "600" },
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
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
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
  },
  emptyCtaText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
