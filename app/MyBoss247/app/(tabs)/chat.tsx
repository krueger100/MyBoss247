import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

type Message = {
  id: string;
  role: "boss" | "employee";
  content: string;
  time: string;
};

const MOCK_MESSAGES: Message[] = [
  {
    id: "1",
    role: "boss",
    content: "0800. Five tasks. No excuses. Move.",
    time: "8:00 AM",
  },
  {
    id: "2",
    role: "employee",
    content: "On it.",
    time: "8:02 AM",
  },
  {
    id: "3",
    role: "boss",
    content: "I pulled your numbers. You've captured $14,280 of today's $27,397. It's noon. Where are the other three tasks?",
    time: "12:00 PM",
  },
  {
    id: "4",
    role: "employee",
    content: "Landing page is shipping today. The video took longer than I thought.",
    time: "12:04 PM",
  },
  {
    id: "5",
    role: "boss",
    content: "That's not a reason. That's a choice. $9,133 is slipping away while you explain. Fix it.",
    time: "12:05 PM",
  },
];

export default function ChatScreen() {
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
  }, []);

  const send = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      role: "employee",
      content: input,
      time: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    // Mock boss response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "b",
          role: "boss",
          content: "Noted. Get back to work.",
          time: new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          }),
        },
      ]);
    }, 1000);
  };

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
              <Text style={styles.statusText}>Tough Coach · Online</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.chatWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.msgRow,
                msg.role === "employee" && styles.msgRowRight,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  msg.role === "employee" ? styles.bubbleEmployee : styles.bubbleBoss,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    msg.role === "employee" && styles.bubbleTextEmployee,
                  ]}
                >
                  {msg.content}
                </Text>
              </View>
              <Text
                style={[
                  styles.time,
                  msg.role === "employee" && { textAlign: "right" },
                ]}
              >
                {msg.time}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Submit report..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!input.trim()}
          >
            <Ionicons name="arrow-up" size={20} color={colors.background} />
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
  bossAvatarText: { color: colors.primary, fontSize: fontSize.md, fontWeight: "800" },
  title: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  statusText: { color: colors.textMuted, fontSize: fontSize.xs },
  chatWrap: { flex: 1 },
  messages: { padding: spacing.md, gap: spacing.md },
  msgRow: { maxWidth: "80%" },
  msgRowRight: { alignSelf: "flex-end" },
  bubble: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
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
  bubbleText: { color: colors.text, fontSize: fontSize.md, lineHeight: 22 },
  bubbleTextEmployee: { color: colors.background, fontWeight: "500" },
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
