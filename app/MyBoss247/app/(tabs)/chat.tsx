import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

const PERSONALITY_LABELS: Record<string, string> = {
  drill_sergeant: "Drill Sergeant",
  tough_coach: "Tough Coach",
  supportive_manager: "Supportive Manager",
};

export default function ChatScreen() {
  const user = useCurrentUser();
  const messages = useQuery(api.chat.list, { limit: 100 });
  const sendMessage = useMutation(api.chat.sendMessage);
  const clearHistory = useMutation(api.chat.clearHistory);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const personality = user?.bossSettings?.personality
    ? PERSONALITY_LABELS[user.bossSettings.personality]
    : "Loading...";

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages?.length, messages?.[messages.length - 1]?.content]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      await sendMessage({ content: text });
    } catch (err: any) {
      Alert.alert("Send failed", err?.message ?? "Try again.");
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const onClear = () => {
    Alert.alert(
      "Clear chat?",
      "All messages will be deleted. Boss won't remember any of this.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await clearHistory({});
            } catch (err: any) {
              Alert.alert("Failed", err?.message ?? "Try again.");
            }
          },
        },
      ]
    );
  };

  const loading = messages === undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.bossAvatar}>
            <Text style={styles.bossAvatarText}>B</Text>
          </View>
          <View>
            <Text style={styles.title}>The Boss</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{personality} · Online</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={onClear} hitSlop={10}>
          <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.chatWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.center}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={56}
              color={colors.textMuted}
            />
            <Text style={styles.emptyTitle}>I'm waiting</Text>
            <Text style={styles.emptyText}>
              Report progress, explain a blocker, or try to talk yourself out of
              something. Either way, I'm listening.
            </Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.messages}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: true })
            }
          >
            {messages.map((msg) => {
              const isEmployee = msg.role === "employee";
              const isPending = msg.status === "sending";
              const isFailed = msg.status === "failed";
              return (
                <View
                  key={msg._id}
                  style={[styles.msgRow, isEmployee && styles.msgRowRight]}
                >
                  <View
                    style={[
                      styles.bubble,
                      isEmployee ? styles.bubbleEmployee : styles.bubbleBoss,
                      isFailed && styles.bubbleFailed,
                    ]}
                  >
                    {isPending ? (
                      <View style={styles.typingRow}>
                        <ActivityIndicator size="small" color={colors.textSecondary} />
                        <Text style={styles.typingText}>typing...</Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.bubbleText,
                          isEmployee && styles.bubbleTextEmployee,
                        ]}
                      >
                        {msg.content}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.time,
                      isEmployee && { textAlign: "right" },
                    ]}
                  >
                    {new Date(msg._creationTime).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Submit report..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            editable={!sending}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!input.trim() || sending) && styles.sendBtnDisabled,
            ]}
            onPress={onSend}
            disabled={!input.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Ionicons name="arrow-up" size={20} color={colors.background} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  bossAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  bossAvatarText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: "800",
  },
  title: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  statusText: { color: colors.textMuted, fontSize: fontSize.xs },
  chatWrap: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  messages: { padding: spacing.md, gap: spacing.md },
  msgRow: { maxWidth: "80%" },
  msgRowRight: { alignSelf: "flex-end" },
  bubble: { padding: spacing.md, borderRadius: borderRadius.lg },
  bubbleBoss: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleEmployee: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.sm,
  },
  bubbleFailed: { borderColor: colors.red, borderWidth: 1 },
  bubbleText: { color: colors.text, fontSize: fontSize.md, lineHeight: 22 },
  bubbleTextEmployee: { color: colors.background, fontWeight: "500" },
  typingRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  typingText: { color: colors.textSecondary, fontSize: fontSize.sm, fontStyle: "italic" },
  time: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 4,
    marginHorizontal: 4,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    fontSize: fontSize.md,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
});
