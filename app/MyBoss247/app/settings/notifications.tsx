import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

const PREFS_KEY = "boss-mode:notification-prefs";

type Prefs = {
  checkIns: boolean;
  inbox: boolean;
  warnings: boolean;
  penalties: boolean;
  reviews: boolean;
  partnerActivity: boolean;
};

const DEFAULTS: Prefs = {
  checkIns: true,
  inbox: true,
  warnings: true,
  penalties: true,
  reviews: true,
  partnerActivity: true,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  const sendTest = useMutation(api.notifications.sendTestNotification);

  const onTestPush = async () => {
    try {
      await sendTest({});
      Alert.alert("Push sent", "Check your notification tray in a few seconds.");
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("No push token")) {
        Alert.alert(
          "Push not available in Expo Go",
          "Remote push notifications require a development build. Once you build with EAS, this will work end-to-end. Foreground/local notifications still work."
        );
      } else {
        Alert.alert("Failed", msg || "Try again.");
      }
    }
  };

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then((raw) => {
      if (raw) {
        try {
          setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
        } catch {}
      }
      setHydrated(true);
    });
  }, []);

  const toggle = async (key: keyof Prefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
  };

  const items: { key: keyof Prefs; label: string; desc: string }[] = [
    { key: "checkIns", label: "Scheduled check-ins", desc: "Morning, midday, afternoon, evening" },
    { key: "inbox", label: "Boss Inbox", desc: "Random unscheduled messages" },
    { key: "warnings", label: "Task warnings", desc: "When tasks turn yellow/orange/red" },
    { key: "penalties", label: "Penalty charges", desc: "When you're about to be charged" },
    { key: "reviews", label: "Weekly reviews", desc: "Sunday performance review notice" },
    { key: "partnerActivity", label: "Partner activity", desc: "Partners completing tasks, missing deadlines" },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.testBtn} onPress={onTestPush}>
          <Ionicons name="notifications" size={20} color={colors.background} />
          <Text style={styles.testBtnText}>Send Test Notification</Text>
        </TouchableOpacity>

        <Text style={styles.testHint}>
          Confirms your device push token is registered. Should appear in your
          notification tray within ~5 seconds.
        </Text>

        <View style={styles.sectionCard}>
          {items.map((item, i) => (
            <View
              key={item.key}
              style={[
                styles.row,
                i < items.length - 1 && styles.rowBorder,
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowSub}>{item.desc}</Text>
              </View>
              <Switch
                value={prefs[item.key]}
                onValueChange={() => toggle(item.key)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.text}
                disabled={!hydrated}
              />
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
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  testBtnText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: "700",
    letterSpacing: 1,
  },
  testHint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: "center",
    fontStyle: "italic",
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  rowLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  rowSub: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
});
