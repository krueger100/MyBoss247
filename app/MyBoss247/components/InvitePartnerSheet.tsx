import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { colors, spacing, fontSize, borderRadius } from "../constants/theme";

export function InvitePartnerSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const me = useCurrentUser();
  const [code, setCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const found = useQuery(
    api.partners.findByInviteCode,
    searching && code.trim().length >= 6 ? { code: code.trim() } : "skip"
  );
  const sendInvite = useMutation(api.partners.sendInvite);

  useEffect(() => {
    if (!visible) {
      setCode("");
      setSearching(false);
    }
  }, [visible]);

  const onCopyMyCode = async () => {
    if (!me?.inviteCode) return;
    await Clipboard.setStringAsync(me.inviteCode);
    Alert.alert("Copied", `${me.inviteCode} copied to clipboard`);
  };

  const onSendInvite = async () => {
    if (!found) return;
    setSending(true);
    try {
      await sendInvite({ targetUserId: found._id as Id<"users"> });
      Alert.alert("Invite sent", `${found.displayName} has been invited.`);
      onClose();
    } catch (err: any) {
      Alert.alert("Failed", err?.message ?? "Couldn't send invite.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Invite a Partner</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {/* Share my code */}
            <View style={styles.section}>
              <Text style={styles.label}>YOUR INVITE CODE</Text>
              <Text style={styles.help}>
                Share this with friends. They paste it below to send you an invite.
              </Text>
              <TouchableOpacity style={styles.codeCard} onPress={onCopyMyCode}>
                <Text style={styles.codeText}>{me?.inviteCode ?? "······"}</Text>
                <View style={styles.copyBadge}>
                  <Ionicons name="copy-outline" size={18} color={colors.text} />
                  <Text style={styles.copyText}>Copy</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Search for partner by code */}
            <View style={styles.section}>
              <Text style={styles.label}>PARTNER'S CODE</Text>
              <Text style={styles.help}>
                Enter their 8-character invite code to send a partnership request.
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. ABCD1234"
                  placeholderTextColor={colors.textMuted}
                  value={code}
                  onChangeText={(v) => {
                    setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8));
                    setSearching(false);
                  }}
                  autoCapitalize="characters"
                  maxLength={8}
                />
                <TouchableOpacity
                  style={[
                    styles.searchBtn,
                    code.trim().length < 6 && styles.searchBtnDisabled,
                  ]}
                  onPress={() => setSearching(true)}
                  disabled={code.trim().length < 6}
                >
                  <Ionicons name="search" size={18} color={colors.background} />
                </TouchableOpacity>
              </View>

              {/* Search result */}
              {searching && found === undefined && (
                <View style={styles.center}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              )}
              {searching && found === null && (
                <View style={styles.notFound}>
                  <Ionicons name="alert-circle-outline" size={20} color={colors.textMuted} />
                  <Text style={styles.notFoundText}>
                    No user found with that code.
                  </Text>
                </View>
              )}
              {searching && found && (
                <View style={styles.foundCard}>
                  <View style={styles.foundAvatar}>
                    <Text style={styles.foundAvatarText}>
                      {found.displayName[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.foundName}>{found.displayName}</Text>
                    <Text style={styles.foundMeta}>
                      🔥 {found.currentStreak}-day streak
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.inviteBtn, sending && { opacity: 0.5 }]}
                    onPress={onSendInvite}
                    disabled={sending}
                  >
                    {sending ? (
                      <ActivityIndicator size="small" color={colors.background} />
                    ) : (
                      <Text style={styles.inviteBtnText}>Invite</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: "85%",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  content: { paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.lg },
  section: { gap: spacing.sm },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  help: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: -2 },
  codeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  codeText: {
    color: colors.primary,
    fontSize: fontSize.xxl,
    fontWeight: "800",
    letterSpacing: 4,
  },
  copyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
  },
  copyText: { color: colors.text, fontSize: fontSize.xs, fontWeight: "600" },
  inputRow: { flexDirection: "row", gap: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "700",
    letterSpacing: 2,
  },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnDisabled: { opacity: 0.4 },
  center: { alignItems: "center", padding: spacing.md },
  notFound: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  notFoundText: { color: colors.textSecondary, fontSize: fontSize.sm },
  foundCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  foundAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  foundAvatarText: { color: colors.text, fontSize: fontSize.lg, fontWeight: "800" },
  foundName: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  foundMeta: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  inviteBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  inviteBtnText: { color: colors.background, fontSize: fontSize.sm, fontWeight: "800" },
});
