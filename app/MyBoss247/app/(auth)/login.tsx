import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSignIn, useOAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);

  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: "oauth_apple" });

  const onLogin = useCallback(async () => {
    if (!isLoaded) return;
    setLoading(true);

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
        return;
      }

      // Email-code first factor — Clerk wants the user to verify via email
      if (result.status === "needs_first_factor") {
        const emailFactor = result.supportedFirstFactors?.find(
          (f: any) => f.strategy === "email_code"
        );
        if (emailFactor) {
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: (emailFactor as any).emailAddressId,
          });
          Alert.alert(
            "Email verification required",
            "We sent a 6-digit code to your email. Use 'Forgot password' for now or contact support to disable email verification on every login."
          );
          return;
        }
        Alert.alert(
          "Sign In",
          "Your account requires extra verification. Try the email-link sign-in or contact support."
        );
        return;
      }

      if (result.status === "needs_second_factor") {
        setNeeds2FA(true);
        return;
      }

      // Fallback for any other intermediate status
      Alert.alert(
        "Sign In",
        `Additional verification required (status: ${result.status}).`
      );
    } catch (err: any) {
      const code = err.errors?.[0]?.code;
      if (code === "form_password_incorrect") {
        Alert.alert("Wrong password", "Check your password and try again.");
      } else if (code === "form_identifier_not_found") {
        Alert.alert(
          "Account not found",
          "No account with that email. Sign up first."
        );
      } else {
        Alert.alert(
          "Sign In Failed",
          err.errors?.[0]?.longMessage ||
            err.errors?.[0]?.message ||
            "Check your email and password."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [isLoaded, email, password]);

  const onVerify2FA = useCallback(async () => {
    if (!isLoaded || !twoFactorCode.trim()) return;
    setLoading(true);
    try {
      const strategy = useBackupCode ? "backup_code" : "totp";
      const result = await signIn.attemptSecondFactor({
        strategy,
        code: twoFactorCode.trim(),
      } as any);

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else {
        Alert.alert("Verification incomplete", `Status: ${result.status}`);
      }
    } catch (err: any) {
      Alert.alert(
        "Verification failed",
        err.errors?.[0]?.longMessage ||
          err.errors?.[0]?.message ||
          "Invalid code. Try again."
      );
    } finally {
      setLoading(false);
    }
  }, [isLoaded, twoFactorCode, useBackupCode]);

  const onOAuthLogin = useCallback(
    async (startFlow: typeof startGoogleOAuth) => {
      try {
        const { createdSessionId, setActive: setOAuthActive } = await startFlow();
        if (createdSessionId && setOAuthActive) {
          await setOAuthActive({ session: createdSessionId });
          router.replace("/(tabs)");
        }
      } catch (err) {
        console.error("OAuth error:", err);
      }
    },
    []
  );

  if (needs2FA) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Two-Factor</Text>
            <Text style={styles.subtitle}>
              {useBackupCode
                ? "Enter one of your saved backup codes"
                : "Open your authenticator app and enter the 6-digit code"}
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder={useBackupCode ? "Backup code" : "123 456"}
              placeholderTextColor={colors.textMuted}
              value={twoFactorCode}
              onChangeText={setTwoFactorCode}
              keyboardType={useBackupCode ? "default" : "number-pad"}
              autoComplete="one-time-code"
              autoFocus
              maxLength={useBackupCode ? 16 : 6}
            />

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={onVerify2FA}
              disabled={loading || !twoFactorCode.trim()}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.primaryButtonText}>Verify</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setUseBackupCode((v) => !v);
                setTwoFactorCode("");
              }}
              style={{ alignItems: "center", marginTop: spacing.md }}
            >
              <Text style={styles.linkText}>
                {useBackupCode
                  ? "Use authenticator code instead"
                  : "Use a backup code instead"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setNeeds2FA(false);
                setTwoFactorCode("");
                setUseBackupCode(false);
              }}
              style={{ alignItems: "center", marginTop: spacing.sm }}
            >
              <Text style={styles.rowText}>Back to sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Clock in to continue</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, styles.inputPassword]}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={10}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setRememberMe((v) => !v)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.rowText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(auth)/forgot-password")}
            >
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={onLogin}
            disabled={loading || !email || !password}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.primaryButtonText}>Clock In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.oauthContainer}>
          <TouchableOpacity
            style={styles.oauthButton}
            onPress={() => onOAuthLogin(startGoogleOAuth)}
          >
            <Text style={styles.oauthButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.oauthButton}
            onPress={() => onOAuthLogin(startAppleOAuth)}
          >
            <Text style={styles.oauthButtonText}>Continue with Apple</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
            <Text style={styles.footerLink}> Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: spacing.lg },
  header: { alignItems: "center", marginBottom: spacing.xl },
  title: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  form: { gap: spacing.md },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passwordWrap: { position: "relative" },
  inputPassword: { paddingRight: 48 },
  eyeBtn: {
    position: "absolute",
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  checkboxRow: { flexDirection: "row", alignItems: "center" },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: { color: colors.background, fontSize: 12, fontWeight: "700" },
  rowText: { color: colors.textSecondary, fontSize: fontSize.sm },
  linkText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: "600" },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: "700",
    letterSpacing: 1,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginHorizontal: spacing.md,
  },
  oauthContainer: { gap: spacing.sm },
  oauthButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  oauthButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  footerText: { color: colors.textSecondary, fontSize: fontSize.sm },
  footerLink: { color: colors.primary, fontSize: fontSize.sm, fontWeight: "600" },
});
