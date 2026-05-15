import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { AvatarPicker } from "../../components/AvatarPicker";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

type Row = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  danger?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

const PERSONALITY_LABELS: Record<string, string> = {
  drill_sergeant: "Drill Sergeant",
  tough_coach: "Tough Coach",
  supportive_manager: "Supportive Manager",
};

const TIER_LABELS: Record<string, string> = {
  trial: "3-Day Free Trial",
  pro: "Pro · $13.95/mo",
  vip: "VIP · $39.95/mo",
};

export default function ProfileScreen() {
  const { user: clerkUser } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const convexUser = useCurrentUser();
  const [signingOut, setSigningOut] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  const loading = convexUser === undefined;

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

  const notReady = (label: string) =>
    Alert.alert("Coming soon", `${label} will be available in a future update.`);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!convexUser) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Ionicons name="alert-circle-outline" size={56} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>Profile unavailable</Text>
        <Text style={styles.emptyText}>
          We couldn't load your profile. Try signing out and back in.
        </Text>
        <TouchableOpacity style={styles.emptyCta} onPress={onSignOut}>
          <Text style={styles.emptyCtaText}>Clock Out</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const personality = PERSONALITY_LABELS[convexUser.bossSettings.personality];
  const personalDays = `${convexUser.personalDaysRemaining} / ${convexUser.personalDaysPerMonth}`;
  const tier = TIER_LABELS[convexUser.subscriptionTier];
  const contractStatus = convexUser.contractSignedAt ? "Signed" : "Not signed";

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: "THE BOSS",
      rows: [
        {
          icon: "construct-outline",
          label: "Boss Settings",
          value: personality,
          onPress: () => router.push("/settings/boss"),
        },
        {
          icon: "document-text-outline",
          label: "My Contract",
          value: contractStatus,
          onPress: () => router.push("/contract"),
        },
        {
          icon: "umbrella-outline",
          label: "Personal Days",
          value: personalDays,
        },
      ],
    },
    {
      title: "MONEY",
      rows: [
        {
          icon: "card-outline",
          label: "Payment Method",
          value: "Not connected",
          onPress: () => notReady("Stripe payment method"),
        },
        {
          icon: "heart-outline",
          label: "Charities",
          value: "None selected",
          onPress: () => notReady("Charity selection"),
        },
        {
          icon: "warning-outline",
          label: "Penalty Settings",
          value: "Not configured",
          onPress: () => notReady("Penalty settings"),
        },
        {
          icon: "receipt-outline",
          label: "Payment History",
          value: "Empty",
          onPress: () => notReady("Payment history"),
        },
      ],
    },
    {
      title: "PERFORMANCE",
      rows: [
        {
          icon: "stats-chart-outline",
          label: "Lifetime Stats",
          onPress: () => router.push("/settings/stats"),
        },
        {
          icon: "trophy-outline",
          label: "Achievements",
          onPress: () => router.push("/settings/achievements"),
        },
        {
          icon: "calendar-outline",
          label: "Performance Reviews",
          onPress: () => router.push("/reviews"),
        },
      ],
    },
    {
      title: "SUBSCRIPTION",
      rows: [
        {
          icon: "star-outline",
          label: "Plan",
          value: tier,
        },
        {
          icon: "diamond-outline",
          label: "Upgrade to VIP",
          onPress: () => notReady("VIP upgrade"),
          disabled: convexUser.subscriptionTier === "vip",
        },
      ],
    },
    {
      title: "ACCOUNT",
      rows: [
        {
          icon: "notifications-outline",
          label: "Notifications",
          onPress: () => router.push("/settings/notifications"),
        },
        {
          icon: "help-circle-outline",
          label: "Help & Support",
          onPress: () => router.push("/settings/help"),
        },
        {
          icon: "document-outline",
          label: "Terms & Privacy",
          onPress: () => router.push("/settings/legal"),
        },
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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => setAvatarPickerOpen(true)}
            activeOpacity={0.8}
          >
            {convexUser.avatarUrl ? (
              <Image
                source={{ uri: convexUser.avatarUrl }}
                style={styles.avatarImg}
              />
            ) : (
              <Text style={styles.avatarText}>
                {convexUser.displayName?.[0]?.toUpperCase() ||
                  clerkUser?.firstName?.[0] ||
                  "E"}
              </Text>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={14} color={colors.background} />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{convexUser.displayName}</Text>
          <Text style={styles.email}>{convexUser.email}</Text>

          <View style={styles.statsStrip}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{convexUser.currentStreak}</Text>
              <Text style={styles.statLabel}>STREAK</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{convexUser.longestStreak}</Text>
              <Text style={styles.statLabel}>BEST</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{convexUser.inviteCode}</Text>
              <Text style={styles.statLabel}>INVITE</Text>
            </View>
          </View>
        </View>

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
                    row.disabled && { opacity: 0.4 },
                  ]}
                  onPress={row.onPress}
                  disabled={(signingOut && row.danger) || row.disabled}
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
                  {!row.danger && !row.disabled && (
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

      <AvatarPicker
        visible={avatarPickerOpen}
        currentUrl={convexUser.avatarUrl}
        initials={
          convexUser.displayName?.[0]?.toUpperCase() ||
          clerkUser?.firstName?.[0] ||
          "E"
        }
        onClose={() => setAvatarPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: "center", alignItems: "center", padding: spacing.lg },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  header: { alignItems: "center", paddingVertical: spacing.lg },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary,
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarText: { color: colors.text, fontSize: 32, fontWeight: "800" },
  avatarEditBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
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
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },
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
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
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
  version: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: "center",
    marginTop: spacing.lg,
    fontStyle: "italic",
  },
});
