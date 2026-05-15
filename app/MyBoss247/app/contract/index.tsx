import { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

export default function ContractScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const signContract = useMutation(api.users.signContract);

  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [signing, setSigning] = useState(false);

  const alreadySigned = !!user?.contractSignedAt;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const remaining = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    if (remaining < 40) setScrolledToBottom(true);
  };

  const onSign = async () => {
    if (!scrolledToBottom) {
      Alert.alert("Read it all", "Scroll to the bottom before signing.");
      return;
    }
    setSigning(true);
    try {
      await signContract({});
      Alert.alert(
        "Contract signed",
        "Welcome aboard. Boss expects results.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert("Failed", err?.message ?? "Couldn't sign.");
    } finally {
      setSigning(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Employment Contract</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        onScroll={onScroll}
        scrollEventThrottle={64}
        showsVerticalScrollIndicator
      >
        <Text style={styles.h1}>BOSS MODE EMPLOYMENT AGREEMENT</Text>
        <Text style={styles.muted}>
          Between: The Boss (the App) and {user?.displayName ?? "Employee"} (you)
        </Text>
        <Text style={styles.muted}>
          Effective Date: {new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </Text>

        <Text style={styles.h2}>1. APPOINTMENT</Text>
        <Text style={styles.body}>
          You hereby appoint The Boss as your accountability authority. You agree
          to perform duties (defined as tasks, goals, and milestones you create)
          to the standard you set for yourself, on the schedule you commit to,
          and under the consequences you configure.
        </Text>

        <Text style={styles.h2}>2. CHECK-INS</Text>
        <Text style={styles.body}>
          You agree to respond to scheduled check-ins (morning, midday,
          afternoon, evening) within a reasonable window. Failure to respond
          does not pause obligations. The Boss may send unscheduled "Boss Inbox"
          messages during working hours, frequency configurable.
        </Text>

        <Text style={styles.h2}>3. PENALTIES</Text>
        <Text style={styles.body}>
          You authorise Boss Mode to charge your saved payment method when:{"\n\n"}
          (a) a daily task remains incomplete past its grace period;{"\n"}
          (b) a weekly/monthly/quarterly goal misses its due date;{"\n"}
          (c) you lose a competitive challenge.{"\n\n"}
          Penalty amounts are set by you in Profile → Penalty Settings. Funds are
          routed to your selected charity or accountability partner — never to
          Boss Mode.
        </Text>

        <Text style={styles.h2}>4. PERSONAL DAYS</Text>
        <Text style={styles.body}>
          You receive a configurable number of Personal Days per month (default:
          2). Invoking a Personal Day pauses penalty triggers for that calendar
          day and preserves your streak. Personal Days do not roll over.
        </Text>

        <Text style={styles.h2}>5. STREAK</Text>
        <Text style={styles.body}>
          Your streak counts consecutive days where you completed 100% of due
          tasks. The Boss tracks both current and longest streaks. Missing tasks
          breaks the streak unless protected by a Personal Day.
        </Text>

        <Text style={styles.h2}>6. THE BOSS'S AUTHORITY</Text>
        <Text style={styles.body}>
          The Boss may speak directly, criticise performance, escalate tone when
          warnings are ignored, and remind you of opportunity cost. The Boss does
          not coddle. You select the personality (Drill Sergeant / Tough Coach /
          Supportive Manager) — degree of bluntness varies, accountability does
          not.
        </Text>

        <Text style={styles.h2}>7. NO REFUNDS ON PENALTIES</Text>
        <Text style={styles.body}>
          Penalty charges are commitment-contract payments, not service fees.
          They are non-refundable except in cases of demonstrable system error.
          You acknowledge this is a feature, not a bug.
        </Text>

        <Text style={styles.h2}>8. TERMINATION</Text>
        <Text style={styles.body}>
          Either party may terminate. Active penalties are settled. Account data
          is preserved for 30 days then deleted. The Boss does not take it
          personally.
        </Text>

        <Text style={styles.h2}>9. NOT GAMBLING</Text>
        <Text style={styles.body}>
          You acknowledge Boss Mode is a commitment-device productivity tool, not
          a wager. Penalty payments go to third parties (charity or partners),
          never to Boss Mode operators.
        </Text>

        <Text style={styles.h2}>10. ACCEPTANCE</Text>
        <Text style={styles.body}>
          By tapping "I Sign and Accept" below, you electronically execute this
          agreement. Your signature is timestamped and stored in your account.
          Print is available on request.
        </Text>

        <Text style={[styles.body, { marginTop: spacing.xl, fontStyle: "italic" }]}>
          Now stop reading and get to work.
        </Text>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <View style={styles.footer}>
        {alreadySigned ? (
          <View style={styles.signedBanner}>
            <Ionicons name="checkmark-circle" size={20} color={colors.green} />
            <Text style={styles.signedText}>
              Signed{" "}
              {new Date(user!.contractSignedAt!).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </View>
        ) : (
          <>
            {!scrolledToBottom && (
              <Text style={styles.hint}>Scroll to the bottom to enable signing.</Text>
            )}
            <TouchableOpacity
              style={[
                styles.signBtn,
                (!scrolledToBottom || signing) && styles.signBtnDisabled,
              ]}
              onPress={onSign}
              disabled={!scrolledToBottom || signing}
            >
              {signing ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <>
                  <Ionicons name="create" size={20} color={colors.background} />
                  <Text style={styles.signBtnText}>I Sign and Accept</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
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
  content: { padding: spacing.lg, gap: spacing.sm },
  h1: { color: colors.text, fontSize: fontSize.xl, fontWeight: "800", textAlign: "center" },
  h2: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: "700",
    marginTop: spacing.lg,
    letterSpacing: 0.5,
  },
  body: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 22 },
  muted: { color: colors.textMuted, fontSize: fontSize.xs, textAlign: "center" },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  hint: { color: colors.textMuted, fontSize: fontSize.xs, textAlign: "center" },
  signBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  signBtnDisabled: { opacity: 0.4 },
  signBtnText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: "800",
    letterSpacing: 1,
  },
  signedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: borderRadius.md,
  },
  signedText: { color: colors.green, fontSize: fontSize.md, fontWeight: "700" },
});
