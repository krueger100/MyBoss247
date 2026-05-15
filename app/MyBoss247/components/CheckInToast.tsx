import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, fontSize, borderRadius } from "../constants/theme";

const TOAST_DURATION_MS = 5000;
const TYPE_LABELS: Record<string, string> = {
  morning: "Morning Brief",
  midday: "Midday Check",
  afternoon: "Afternoon Push",
  evening: "End of Day Review",
  warning: "⚠️ Warning",
  inbox: "Boss Message",
};

/**
 * Shows a slide-down toast at the top of the screen when a new pending
 * check-in arrives. Works fully offline-from-push because it watches the
 * Convex reactive query.
 */
export function CheckInToast({
  onTap,
}: {
  onTap: (checkIn: any) => void;
}) {
  const insets = useSafeAreaInsets();
  const pending = useQuery(api.checkIns.pending);
  const lastSeenIdRef = useRef<string | null>(null);
  const lastSeenInitialized = useRef(false);

  const [visibleCheckIn, setVisibleCheckIn] = useState<any | null>(null);
  const translateY = useRef(new Animated.Value(-200)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pending) return;

    // Initialize "last seen" on first load so we don't toast existing items
    if (!lastSeenInitialized.current) {
      lastSeenIdRef.current = pending[0]?._id ?? null;
      lastSeenInitialized.current = true;
      return;
    }

    if (pending.length === 0) return;
    const newest = pending[pending.length - 1]; // sorted ascending in query
    if (!newest) return;

    // If newest is different from what we've already shown, show it
    if (newest._id !== lastSeenIdRef.current) {
      lastSeenIdRef.current = newest._id;
      showToast(newest);
    }
  }, [pending]);

  const showToast = (ci: any) => {
    setVisibleCheckIn(ci);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();

    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => hide(), TOAST_DURATION_MS);
  };

  const hide = () => {
    Animated.timing(translateY, {
      toValue: -200,
      duration: 250,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setVisibleCheckIn(null);
    });
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  };

  if (!visibleCheckIn) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing.sm,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        onPress={() => {
          onTap(visibleCheckIn);
          hide();
        }}
      >
        <View style={styles.icon}>
          <Ionicons name="notifications" size={20} color={colors.background} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {TYPE_LABELS[visibleCheckIn.checkInType] ?? "Boss"}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {visibleCheckIn.bossMessage}
          </Text>
        </View>
        <TouchableOpacity onPress={hide} hitSlop={10}>
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    zIndex: 999,
    ...(Platform.OS === "android" ? { elevation: 12 } : {}),
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.primary, fontSize: fontSize.sm, fontWeight: "800" },
  body: { color: colors.text, fontSize: fontSize.sm, marginTop: 2 },
});
