import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Calendar } from "../../components/Calendar";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

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
  });
}

export default function CreateChallengeScreen() {
  const router = useRouter();
  const { opponentId } = useLocalSearchParams<{ opponentId?: string }>();
  const partners = useQuery(api.partners.list);
  const createChallenge = useMutation(api.challenges.create);

  const today = dateToYMD(new Date());
  const sevenDays = new Date();
  sevenDays.setDate(sevenDays.getDate() + 7);
  const endDefault = dateToYMD(sevenDays);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [opponent, setOpponent] = useState<string | undefined>(opponentId);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(endDefault);
  const [stake, setStake] = useState("50");
  const [payoutTarget, setPayoutTarget] = useState<"winner" | "charity">("winner");
  const [creating, setCreating] = useState(false);
  const [startCalOpen, setStartCalOpen] = useState(false);
  const [endCalOpen, setEndCalOpen] = useState(false);

  const activePartners = (partners ?? []).filter((p) => p.status === "active");

  // Auto-select first partner if none passed in
  useEffect(() => {
    if (!opponent && activePartners.length > 0) {
      setOpponent(activePartners[0].other?._id);
    }
  }, [activePartners.length, opponent]);

  const onCreate = async () => {
    if (!title.trim()) return Alert.alert("Missing title", "Name the challenge.");
    if (!opponent) return Alert.alert("Missing opponent", "Pick a partner to challenge.");
    const stakeNum = parseFloat(stake);
    if (isNaN(stakeNum) || stakeNum <= 0)
      return Alert.alert("Invalid stake", "Enter a positive stake amount.");
    if (endDate <= startDate)
      return Alert.alert("Invalid dates", "End date must be after start date.");

    setCreating(true);
    try {
      const id = await createChallenge({
        title: title.trim(),
        description: description.trim() || undefined,
        opponentUserId: opponent as Id<"users">,
        startDate,
        endDate,
        stakeAmount: stakeNum,
        penaltyTarget: payoutTarget,
      });
      router.replace(`/challenge/${id}`);
    } catch (err: any) {
      Alert.alert("Failed", err?.message ?? "Couldn't create challenge.");
    } finally {
      setCreating(false);
    }
  };

  if (activePartners.length === 0 && partners !== undefined) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Ionicons name="people-outline" size={56} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No partners yet</Text>
        <Text style={styles.emptyText}>
          You need at least one accountability partner to create a challenge.
        </Text>
        <TouchableOpacity style={styles.cta} onPress={() => router.back()}>
          <Text style={styles.ctaText}>Go back & invite</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>New Challenge</Text>
        <TouchableOpacity
          onPress={onCreate}
          disabled={creating || !title.trim() || !opponent}
          hitSlop={10}
        >
          {creating ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text
              style={[
                styles.saveBtn,
                (!title.trim() || !opponent) && styles.saveBtnDisabled,
              ]}
            >
              Create
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>CHALLENGE NAME *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Q2 Sprint, Ship Race"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
          <TextInput
            style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]}
            placeholder="What's the bet about?"
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>OPPONENT *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {activePartners.map((p) =>
                p.other ? (
                  <TouchableOpacity
                    key={p.other._id}
                    style={[
                      styles.partnerChip,
                      opponent === p.other._id && styles.partnerChipActive,
                    ]}
                    onPress={() => setOpponent(p.other!._id)}
                  >
                    <Text
                      style={[
                        styles.partnerChipText,
                        opponent === p.other._id && { color: colors.primary },
                      ]}
                    >
                      {p.other.displayName}
                    </Text>
                  </TouchableOpacity>
                ) : null
              )}
            </View>
          </ScrollView>
        </View>

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
                if (d >= endDate) {
                  // bump end forward
                  const next = new Date(d + "T00:00:00");
                  next.setDate(next.getDate() + 7);
                  setEndDate(dateToYMD(next));
                }
                setStartCalOpen(false);
              }}
              minDate={today}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>END DATE</Text>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setEndCalOpen((v) => !v)}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.dateBtnText}>{formatDate(endDate)}</Text>
            <Ionicons
              name={endCalOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
          {endCalOpen && (
            <Calendar
              value={endDate}
              onChange={(d) => {
                setEndDate(d);
                setEndCalOpen(false);
              }}
              minDate={startDate}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>STAKE AMOUNT</Text>
          <Text style={styles.help}>
            Loser owes this much. Honour-system payment until Stripe is wired.
          </Text>
          <View style={styles.currencyInput}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={[styles.input, { paddingLeft: 32 }]}
              placeholder="50"
              placeholderTextColor={colors.textMuted}
              value={stake}
              onChangeText={(v) => setStake(v.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>PAYOUT GOES TO</Text>
          <View style={{ gap: spacing.xs }}>
            <TouchableOpacity
              style={[
                styles.payoutRow,
                payoutTarget === "winner" && styles.payoutRowActive,
              ]}
              onPress={() => setPayoutTarget("winner")}
            >
              <Ionicons name="trophy-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.payoutLabel}>Winner takes the pot</Text>
                <Text style={styles.payoutSub}>Loser pays winner directly</Text>
              </View>
              {payoutTarget === "winner" && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.payoutRow,
                payoutTarget === "charity" && styles.payoutRowActive,
              ]}
              onPress={() => setPayoutTarget("charity")}
            >
              <Ionicons name="heart-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.payoutLabel}>Loser donates to charity</Text>
                <Text style={styles.payoutSub}>Both lose nothing if they win</Text>
              </View>
              {payoutTarget === "charity" && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.confirmBtn, creating && { opacity: 0.5 }]}
          onPress={onCreate}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.confirmText}>Create Challenge</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  saveBtn: { color: colors.primary, fontSize: fontSize.md, fontWeight: "700" },
  saveBtnDisabled: { color: colors.textMuted },
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  chipRow: { flexDirection: "row", gap: spacing.sm },
  partnerChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  partnerChipActive: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderColor: colors.primary,
  },
  partnerChipText: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
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
  payoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  payoutRowActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
  },
  payoutLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  payoutSub: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  confirmText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: "800",
    letterSpacing: 1,
  },
  emptyTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: "center" },
  cta: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  ctaText: { color: colors.background, fontSize: fontSize.md, fontWeight: "700" },
});
