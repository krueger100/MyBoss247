import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSignUp, useOAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { colors, spacing, fontSize, borderRadius } from "../../constants/theme";

WebBrowser.maybeCompleteAuthSession();

type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
};

function getPasswordStrength(pwd: string): PasswordStrength {
  if (!pwd) return { score: 0, label: "", color: colors.border };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  const levels: PasswordStrength[] = [
    { score: 0, label: "", color: colors.border },
    { score: 1, label: "Weak", color: colors.red },
    { score: 2, label: "Fair", color: colors.orange },
    { score: 3, label: "Good", color: colors.yellow },
    { score: 4, label: "Strong", color: colors.green },
  ];
  return levels[score] as PasswordStrength;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);

  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: "oauth_apple" });

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!displayName.trim()) e.displayName = "Enter your name";
    if (!emailRegex.test(email)) e.email = "Enter a valid email";
    if (password.length < 8) e.password = "Min 8 characters";
    else if (strength.score < 2) e.password = "Password too weak";
    if (password !== confirmPassword) e.confirmPassword = "Passwords don't match";
    if (!acceptedTerms) e.terms = "Accept terms to continue";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [displayName, email, password, confirmPassword, acceptedTerms, strength.score]);

  const onSignUp = useCallback(async () => {
    setTopError(null);
    if (!validate() || !isLoaded) return;
    setLoading(true);

    try {
      // Build a username from the email (in case Clerk requires it).
      const usernameGuess = email
        .split("@")[0]
        .replace(/[^a-zA-Z0-9_]/g, "")
        .slice(0, 20) + Math.floor(Math.random() * 1000);

      // Split display name into first / last for Clerk
      const [firstName, ...rest] = displayName.trim().split(/\s+/);
      const lastName = rest.join(" ") || undefined;

      await signUp.create({
        emailAddress: email,
        password,
        firstName,
        ...(lastName ? { lastName } : {}),
        ...(usernameGuess ? { username: usernameGuess } : {}),
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setPendingVerification(true);
    } catch (err: any) {
      setTopError(
        err.errors?.[0]?.longMessage ||
          err.errors?.[0]?.message ||
          "Sign up failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [isLoaded, email, password, displayName, validate]);

  const onVerify = useCallback(async () => {
    setTopError(null);
    if (!isLoaded) return;
    if (!code.trim()) {
      setErrors({ code: "Enter the verification code" });
      return;
    }
    setLoading(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      // Activate the session if Clerk created one, regardless of overall status
      if (result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
        return;
      }

      if (result.status === "complete") {
        // No createdSessionId yet — give Clerk a beat to surface it
        if (signUp.createdSessionId) {
          await setActive({ session: signUp.createdSessionId });
        }
        router.replace("/(tabs)");
      } else if (result.status === "missing_requirements") {
        // Try to fill missing fields automatically
        const missing = (result.missingFields ?? []) as string[];
        const updates: Record<string, unknown> = {};
        if (missing.includes("username")) {
          updates.username =
            email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") +
            Math.floor(Math.random() * 1000);
        }
        if (Object.keys(updates).length > 0) {
          try {
            await signUp.update(updates);
            const retried = await signUp.attemptEmailAddressVerification({ code });
            if (retried.createdSessionId) {
              await setActive({ session: retried.createdSessionId });
              router.replace("/(tabs)");
              return;
            }
          } catch (e) {
            // fall through to error message
          }
        }
        setTopError(
          missing.length > 0
            ? `Missing required fields: ${missing.join(", ")}. Update Clerk dashboard or contact support.`
            : "Almost there — some required fields are missing."
        );
      } else {
        setTopError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      const code = err.errors?.[0]?.code;

      // Email already verified — recover by activating the existing session
      if (code === "verification_already_verified" || code === "already_verified") {
        try {
          if (signUp.createdSessionId) {
            await setActive({ session: signUp.createdSessionId });
            router.replace("/(tabs)");
            return;
          }
          // No session on signUp — user likely already signed in elsewhere; send to login
          setTopError(
            "This email is already verified. Please sign in instead."
          );
          setTimeout(() => router.replace("/(auth)/login"), 1500);
        } catch {
          router.replace("/(auth)/login");
        }
      } else {
        setTopError(
          err.errors?.[0]?.longMessage ||
            err.errors?.[0]?.message ||
            "Invalid code. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [isLoaded, code, signUp]);

  const onResendCode = useCallback(async () => {
    if (!isLoaded) return;
    setTopError(null);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setTopError(null);
      Alert.alert("Code sent", `New verification code sent to ${email}.`);
    } catch (err: any) {
      setTopError(
        err.errors?.[0]?.longMessage ||
          err.errors?.[0]?.message ||
          "Failed to resend code."
      );
    }
  }, [isLoaded, email, signUp]);

  const onOAuthSignUp = useCallback(
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

  // Verification screen
  if (pendingVerification) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to {email}
            </Text>
          </View>

          {topError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{topError}</Text>
            </View>
          )}

          <View style={styles.form}>
            <TextInput
              style={[styles.input, errors.code && styles.inputError]}
              placeholder="Verification Code"
              placeholderTextColor={colors.textMuted}
              value={code}
              onChangeText={(v) => {
                setCode(v);
                if (errors.code) setErrors({ ...errors, code: "" });
              }}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={6}
            />
            {errors.code ? <Text style={styles.fieldError}>{errors.code}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={onVerify}
              disabled={loading || !code}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.primaryButtonText}>Verify</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendRow}>
              <Text style={styles.footerText}>Didn't get a code?</Text>
              <TouchableOpacity onPress={onResendCode}>
                <Text style={styles.footerLink}> Resend</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                setPendingVerification(false);
                setCode("");
                setTopError(null);
              }}
              style={{ alignItems: "center", marginTop: spacing.sm }}
            >
              <Text style={styles.footerText}>Back to sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Signup form
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Ready to get to work? Let's set you up.
          </Text>
        </View>

        {topError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{topError}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View>
            <TextInput
              style={[styles.input, errors.displayName && styles.inputError]}
              placeholder="Full Name"
              placeholderTextColor={colors.textMuted}
              value={displayName}
              onChangeText={(v) => {
                setDisplayName(v);
                if (errors.displayName) setErrors({ ...errors, displayName: "" });
              }}
              autoCapitalize="words"
              autoComplete="name"
            />
            {errors.displayName ? (
              <Text style={styles.fieldError}>{errors.displayName}</Text>
            ) : null}
          </View>

          <View>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (errors.email) setErrors({ ...errors, email: "" });
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            {errors.email ? (
              <Text style={styles.fieldError}>{errors.email}</Text>
            ) : null}
          </View>

          <View>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[
                  styles.input,
                  styles.inputPassword,
                  errors.password && styles.inputError,
                ]}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (errors.password) setErrors({ ...errors, password: "" });
                }}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
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
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBars}>
                  {[1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor:
                            i <= strength.score ? strength.color : colors.border,
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
              </View>
            )}
            {errors.password ? (
              <Text style={styles.fieldError}>{errors.password}</Text>
            ) : null}
          </View>

          <View>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[
                  styles.input,
                  styles.inputPassword,
                  errors.confirmPassword && styles.inputError,
                  passwordsMatch && styles.inputSuccess,
                ]}
                placeholder="Confirm Password"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={(v) => {
                  setConfirmPassword(v);
                  if (errors.confirmPassword)
                    setErrors({ ...errors, confirmPassword: "" });
                }}
                secureTextEntry={!showConfirmPassword}
                autoComplete="new-password"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirmPassword((v) => !v)}
                hitSlop={10}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? (
              <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
            ) : passwordsMatch ? (
              <Text style={styles.fieldSuccess}>Passwords match</Text>
            ) : null}
          </View>

          {/* Terms checkbox */}
          <View>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => {
                setAcceptedTerms((v) => !v);
                if (errors.terms) setErrors({ ...errors, terms: "" });
              }}
            >
              <View
                style={[
                  styles.checkbox,
                  acceptedTerms && styles.checkboxChecked,
                  errors.terms && styles.checkboxError,
                ]}
              >
                {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.termsText}>
                I agree to the{" "}
                <Text
                  style={styles.linkText}
                  onPress={() => Linking.openURL("https://example.com/terms")}
                >
                  Terms
                </Text>{" "}
                and{" "}
                <Text
                  style={styles.linkText}
                  onPress={() => Linking.openURL("https://example.com/privacy")}
                >
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>
            {errors.terms ? (
              <Text style={styles.fieldError}>{errors.terms}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={onSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.primaryButtonText}>Get Hired</Text>
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
            onPress={() => onOAuthSignUp(startGoogleOAuth)}
            disabled={loading}
          >
            <Text style={styles.oauthButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.oauthButton}
            onPress={() => onOAuthSignUp(startAppleOAuth)}
            disabled={loading}
          >
            <Text style={styles.oauthButtonText}>Continue with Apple</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
            <Text style={styles.footerLink}> Clock In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: spacing.lg },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
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
  inputError: { borderColor: colors.red },
  inputSuccess: { borderColor: colors.green },
  passwordWrap: { position: "relative" },
  inputPassword: { paddingRight: 48 },
  eyeBtn: {
    position: "absolute",
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  fieldError: {
    color: colors.red,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  fieldSuccess: {
    color: colors.green,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  errorBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: colors.red,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorBannerText: { color: colors.red, fontSize: fontSize.sm },
  strengthContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  strengthBars: { flex: 1, flexDirection: "row", gap: 4 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    minWidth: 50,
    textAlign: "right",
  },
  checkboxRow: { flexDirection: "row", alignItems: "flex-start" },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxError: { borderColor: colors.red },
  checkmark: { color: colors.background, fontSize: 12, fontWeight: "700" },
  termsText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  linkText: { color: colors.primary, fontWeight: "600" },
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
  oauthButtonText: { color: colors.text, fontSize: fontSize.md, fontWeight: "500" },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  footerText: { color: colors.textSecondary, fontSize: fontSize.sm },
  footerLink: { color: colors.primary, fontSize: fontSize.sm, fontWeight: "600" },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.md,
  },
});
