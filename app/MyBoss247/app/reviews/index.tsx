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
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

function scoreColor(score: number) {
  if (score >= 80) return colors.green;
  if (score >= 60) return colors.yellow;
  if (score >= 40) return colors.orange;
  return colors.red;
}

export default function ReviewsListScreen() {
  const router = useRouter();
  const reviews = useQuery(api.reviews.list, { limit: 50 });
  const triggerNow = useMutation(api.reviews.triggerNowForMe);

  const loading = reviews === undefined;

  const onGenerate = async () => {
    try {
      await triggerNow({});
      Alert.alert(
        "Review generating",
        "Your weekly review is being created. It'll appear here in a few seconds."
      );
    } catch (err: any) {
      Alert.alert("Failed", err?.message || "Couldn't generate review.");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Performance Reviews</Text>
        <TouchableOpacity onPress={onGenerate} hitSlop={10}>
          <Ionicons name="add-circle" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="document-text-outline"
            size={56}
            color={colors.textMuted}
          />
          <Text style={styles.emptyTitle}>No reviews yet</Text>
          <Text style={styles.emptyText}>
            Boss publishes a weekly review every Sunday. Tap the + button to
            generate one for the past 7 days now.
          </Text>
          <TouchableOpacity style={styles.cta} onPress={onGenerate}>
            <Text style={styles.ctaText}>Generate Review</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {reviews.map((r) => (
            <TouchableOpacity
              key={r._id}
              style={styles.row}
              onPress={() => router.push(`/reviews/${r._id}`)}
            >
              <View
                style={[
                  styles.scoreBadge,
                  { borderColor: scoreColor(r.score) },
                ]}
              >
                <Text
                  style={[styles.scoreText, { color: scoreColor(r.score) }]}
                >
                  {r.score}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.weekLabel}>
                  Week of{" "}
                  {new Date(r.weekStartDate + "T00:00:00").toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" }
                  )}
                </Text>
                <Text style={styles.meta}>
                  {r.tasksCompleted}/{r.tasksTotal} tasks · $
                  {r.valueCaptured.toLocaleString()} captured
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxl, gap: spacing.md },
  emptyTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: "center", lineHeight: 20 },
  cta: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  ctaText: { color: colors.background, fontSize: fontSize.md, fontWeight: "700", letterSpacing: 1 },
  list: { padding: spacing.md, gap: spacing.sm },
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
  scoreBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: { fontSize: fontSize.md, fontWeight: "800" },
  weekLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  meta: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
});
