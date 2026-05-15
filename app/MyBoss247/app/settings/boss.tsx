import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

type Personality = "drill_sergeant" | "tough_coach" | "supportive_manager";
type InboxFreq = "off" | "light" | "normal" | "intense";

const PERSONALITIES: { id: Personality; emoji: string; name: string; tagline: string }[] = [
  { id: "drill_sergeant", emoji: "🪖", name: "Drill Sergeant", tagline: "Aggressive. Zero tolerance. Military-style." },
  { id: "tough_coach", emoji: "💪", name: "Tough Coach", tagline: "Firm but fair. Results-focused." },
  { id: "supportive_manager", emoji: "🤝", name: "Supportive Manager", tagline: "Encouraging. Still holds accountability." },
];

const INBOX_FREQS: { id: InboxFreq; label: string; desc: string }[] = [
  { id: "off", label: "Off", desc: "No random messages" },
  { id: "light", label: "Light", desc: "~1 random message per day" },
  { id: "normal", label: "Normal", desc: "~2 random messages per day" },
  { id: "intense", label: "Intense", desc: "~3 random messages per day" },
];

// HH:MM 24h validator + format helpers
function isValidHM(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

function format12h(hm: string): string {
  if (!isValidHM(hm)) return hm;
  const [h, m] = hm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

export default function BossSettingsScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const updateUser = useMutation(api.users.updateUser);

  const [personality, setPersonality] = useState<Personality>("tough_coach");
  const [inboxFreq, setInboxFreq] = useState<InboxFreq>("normal");
  const [morning, setMorning] = useState("08:00");
  const [midday, setMidday] = useState("12:00");
  const [afternoon, setAfternoon] = useState("15:00");
  const [evening, setEvening] = useState("18:00");
  const [whStart, setWhStart] = useState("09:00");
  const [whEnd, setWhEnd] = useState("18:00");
  const [personalDays, setPersonalDays] = useState("2");

  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Hydrate from user
  useEffect(() => {
    if (!user) return;
    setPersonality(user.bossSettings.personality);
    setInboxFreq(user.bossSettings.inboxFrequency);
    setMorning(user.bossSettings.checkinTimes.morning);
    setMidday(user.bossSettings.checkinTimes.midday);
    setAfternoon(user.bossSettings.checkinTimes.afternoon);
    setEvening(user.bossSettings.checkinTimes.evening);
    setWhStart(user.bossSettings.workingHoursStart);
    setWhEnd(user.bossSettings.workingHoursEnd);
    setPersonalDays(String(user.personalDaysPerMonth));
    setDirty(false);
  }, [user?._id]);

  const markDirty = () => setDirty(true);

  const onSave = async () => {
    const times = { morning, midday, afternoon, evening };
    for (const [k, v] of Object.entries(times)) {
      if (!isValidHM(v)) {
        Alert.alert("Invalid time", `${k} must be HH:MM (24h)`);
        return;
      }
    }
    if (!isValidHM(whStart) || !isValidHM(whEnd)) {
      Alert.alert("Invalid time", "Working hours must be HH:MM (24h)");
      return;
    }
    const pdNum = parseInt(personalDays, 10);
    if (isNaN(pdNum) || pdNum < 0 || pdNum > 5) {
      Alert.alert("Invalid", "Personal days per month must be 0–5.");
      return;
    }

    setSaving(true);
    try {
      await updateUser({
        bossPersonality: personality,
        inboxFrequency: inboxFreq,
        checkinTimes: times,
        workingHoursStart: whStart,
        workingHoursEnd: whEnd,
        personalDaysPerMonth: pdNum,
      });
      setDirty(false);
      Alert.alert("Saved", "Boss settings updated.");
    } catch (err: any) {
      Alert.alert("Failed", err?.message ?? "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Boss Settings</Text>
        <TouchableOpacity onPress={onSave} disabled={!dirty || saving} hitSlop={10}>
          {saving ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.saveBtn, !dirty && styles.saveBtnDisabled]}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Personality */}
        <View style={styles.section}>
          <Text style={styles.label}>PERSONALITY</Text>
          <Text style={styles.help}>How the Boss talks to you.</Text>
          <View style={{ gap: spacing.sm }}>
            {PERSONALITIES.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.personalityCard,
                  personality === p.id && styles.personalityActive,
                ]}
                onPress={() => {
                  setPersonality(p.id);
                  markDirty();
                }}
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

        {/* Check-in times */}
        <View style={styles.section}>
          <Text style={styles.label}>CHECK-IN TIMES</Text>
          <Text style={styles.help}>When the Boss messages you each day (24h format).</Text>
          <TimeRow label="Morning Brief" value={morning} onChange={(v) => { setMorning(v); markDirty(); }} />
          <TimeRow label="Midday Check" value={midday} onChange={(v) => { setMidday(v); markDirty(); }} />
          <TimeRow label="Afternoon Push" value={afternoon} onChange={(v) => { setAfternoon(v); markDirty(); }} />
          <TimeRow label="End of Day Review" value={evening} onChange={(v) => { setEvening(v); markDirty(); }} />
        </View>

        {/* Working hours */}
        <View style={styles.section}>
          <Text style={styles.label}>WORKING HOURS</Text>
          <Text style={styles.help}>Random Boss Inbox messages only fire during this window.</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TimeRow label="Start" value={whStart} onChange={(v) => { setWhStart(v); markDirty(); }} />
            </View>
            <View style={{ flex: 1 }}>
              <TimeRow label="End" value={whEnd} onChange={(v) => { setWhEnd(v); markDirty(); }} />
            </View>
          </View>
        </View>

        {/* Boss Inbox frequency */}
        <View style={styles.section}>
          <Text style={styles.label}>BOSS INBOX FREQUENCY</Text>
          <Text style={styles.help}>How often the Boss sends unscheduled messages.</Text>
          <View style={{ gap: spacing.xs }}>
            {INBOX_FREQS.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.row,
                  inboxFreq === f.id && styles.rowActive,
                ]}
                onPress={() => {
                  setInboxFreq(f.id);
                  markDirty();
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{f.label}</Text>
                  <Text style={styles.rowSub}>{f.desc}</Text>
                </View>
                {inboxFreq === f.id && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Personal Days per month */}
        <View style={styles.section}>
          <Text style={styles.label}>PERSONAL DAYS PER MONTH</Text>
          <Text style={styles.help}>How many streak-protection days you get. (0–5)</Text>
          <View style={styles.numStepper}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => {
                const n = Math.max(0, (parseInt(personalDays, 10) || 0) - 1);
                setPersonalDays(String(n));
                markDirty();
              }}
            >
              <Ionicons name="remove" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.numText}>{personalDays}</Text>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => {
                const n = Math.min(5, (parseInt(personalDays, 10) || 0) + 1);
                setPersonalDays(String(n));
                markDirty();
              }}
            >
              <Ionicons name="add" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TimeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.timeRow}>
      <Text style={styles.timeRowLabel}>{label}</Text>
      <View style={{ alignItems: "flex-end" }}>
        <TextInput
          style={styles.timeInput}
          value={value}
          onChangeText={(v) => {
            // Allow partial: digits + one colon
            const cleaned = v.replace(/[^0-9:]/g, "").slice(0, 5);
            onChange(cleaned);
          }}
          placeholder="HH:MM"
          placeholderTextColor={colors.textMuted}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
        />
        {isValidHM(value) && (
          <Text style={styles.timePreview}>{format12h(value)}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  personalityTagline: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeRowLabel: { color: colors.text, fontSize: fontSize.md, flex: 1 },
  timeInput: {
    width: 80,
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: "700",
    textAlign: "right",
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  timePreview: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
  },
  rowLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  rowSub: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  numStepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: {
    flex: 1,
    textAlign: "center",
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
});
