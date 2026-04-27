import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

type Row = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  danger?: boolean;
  onPress?: () => void;
};

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = () => {
    Alert.alert("Clock Out?", "You'll need to sign back in to continue.", [
      { text: "Stay", style: "cancel" },
      {
        text: "Clock Out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
            router.replace("/(auth)/login");
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: "THE BOSS",
      rows: [
        { icon: "construct-outline", label: "Boss Settings", value: "Tough Coach" },
        { icon: "document-text-outline", label: "My Contract", value: "Signed" },
        { icon: "umbrella-outline", label: "Personal Days", value: "2 / 2" },
      ],
    },
    {
      title: "MONEY",
      rows: [
        { icon: "card-outline", label: "Payment Method", value: "Visa ••4242" },
        { icon: "heart-outline", label: "Charities", value: "3 selected" },
        { icon: "warning-outline", label: "Penalty Settings", value: "$25 / task" },
        { icon: "receipt-outline", label: "Payment History" },
      ],
    },
    {
      title: "PERFORMANCE",
      rows: [
        { icon: "stats-chart-outline", label: "Lifetime Stats" },
        { icon: "calendar-outline", label: "Performance Reviews", value: "12 reviews" },
      ],
    },
    {
      title: "SUBSCRIPTION",
      rows: [
        { icon: "star-outline", label: "Plan", value: "Pro · $13.95/mo" },
        { icon: "diamond-outline", label: "Upgrade to VIP" },
      ],
    },
    {
      title: "ACCOUNT",
      rows: [
        { icon: "notifications-outline", label: "Notifications" },
        { icon: "help-circle-outline", label: "Help & Support" },
        { icon: "document-outline", label: "Terms & Privacy" },
        {
          icon: "log-out-outline",
          label: signingOut ? "Clocking out..." : "Clock Out",
          danger: true,
          onPress: onSignOut,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.firstName?.[0] || "E"}
            </Text>
          </View>
          <Text style={styles.name}>
            {user?.fullName || user?.firstName || "Employee"}
          </Text>
          <Text style={styles.email}>
            {user?.primaryEmailAddress?.emailAddress}
          </Text>

          <View style={styles.statsStrip}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>STREAK</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.green }]}>$164K</Text>
              <Text style={styles.statLabel}>CAPTURED</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.red }]}>$28K</Text>
              <Text style={styles.statLabel}>LOST</Text>
            </View>
          </View>
        </View>

        {/* Sections */}
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.rows.map((row, i) => (
                <TouchableOpacity
                  key={row.label}
                  style={[
                    styles.row,
                    i < section.rows.length - 1 && styles.rowBorder,
                  ]}
                  onPress={row.onPress}
                  disabled={signingOut && row.danger}
                >
                  <Ionicons
                    name={row.icon}
                    size={20}
                    color={row.danger ? colors.red : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.rowLabel,
                      row.danger && { color: colors.red },
                    ]}
                  >
                    {row.label}
                  </Text>
                  {row.value && <Text style={styles.rowValue}>{row.value}</Text>}
                  {!row.danger && (
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.textMuted}
                    />
                  )}
                  {signingOut && row.danger && (
                    <ActivityIndicator size="small" color={colors.red} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.version}>Boss Mode v1.0 · You work for me.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  header: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarText: { color: colors.text, fontSize: 32, fontWeight: "800" },
  name: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  email: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 4 },
  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stat: { alignItems: "center", flex: 1 },
  statValue: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  statLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  section: { gap: spacing.sm },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginLeft: spacing.xs,
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
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowLabel: { flex: 1, color: colors.text, fontSize: fontSize.md },
  rowValue: { color: colors.textSecondary, fontSize: fontSize.sm },
  version: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: "center",
    marginTop: spacing.lg,
    fontStyle: "italic",
  },
});
