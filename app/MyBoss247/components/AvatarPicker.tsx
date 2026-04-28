import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, fontSize, borderRadius } from "../constants/theme";

type Source = "camera" | "library" | "history";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB after compression
const TARGET_SIZE = 512; // 1:1 square at 512x512
const ALLOWED_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export function AvatarPicker({
  visible,
  currentUrl,
  initials,
  onClose,
}: {
  visible: boolean;
  currentUrl?: string;
  initials: string;
  onClose: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [source, setSource] = useState<Source | null>(null);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const setAvatar = useMutation(api.files.setAvatar);
  const appendHistory = useMutation(api.files.appendAvatarHistory);
  const history = useQuery(api.files.listAvatarHistory);

  const reset = () => {
    setPreviewUri(null);
    setSource(null);
    setUploading(false);
  };

  const closeAll = () => {
    reset();
    onClose();
  };

  const explainPermission = (kind: "camera" | "library") => {
    Alert.alert(
      `${kind === "camera" ? "Camera" : "Photo library"} access required`,
      `We need ${kind === "camera" ? "camera" : "photo library"} access to update your profile picture. You can enable it in Settings.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ]
    );
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return explainPermission("camera");

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setSource("camera");
      setPreviewUri(asset.uri);
    } catch (err) {
      Alert.alert("Camera error", "Couldn't open the camera. Try again.");
    }
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return explainPermission("library");

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (result.canceled) return;
      const asset = result.assets[0];

      if (asset.mimeType && !ALLOWED_MIMES.includes(asset.mimeType)) {
        Alert.alert("Unsupported image", "Use a JPG, PNG, or WebP image.");
        return;
      }

      setSource("library");
      setPreviewUri(asset.uri);
    } catch (err) {
      Alert.alert("Library error", "Couldn't open your photos. Try again.");
    }
  };

  const reuseHistoryItem = async (url: string) => {
    setSource("history");
    setUploading(true);
    try {
      // History items already point to a Convex-hosted URL — just patch user
      // with the same URL (no re-upload needed). We re-resolve via the existing
      // storageId so we keep referential integrity.
      const item = history?.find((h) => h.url === url);
      if (!item) throw new Error("Image not found");
      await setAvatar({ storageId: item.storageId as any });
      closeAll();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Couldn't apply that image.");
    } finally {
      setUploading(false);
    }
  };

  const confirmUpload = async () => {
    if (!previewUri) return;
    setUploading(true);
    try {
      // Resize + compress to a 512x512 JPEG
      const processed = await ImageManipulator.manipulateAsync(
        previewUri,
        [{ resize: { width: TARGET_SIZE, height: TARGET_SIZE } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Validate output
      const blob = await fetch(processed.uri).then((r) => r.blob());
      if (blob.size > MAX_BYTES) {
        Alert.alert(
          "Image too large",
          "We couldn't compress this image enough. Try a different one."
        );
        return;
      }
      if (!blob.type.startsWith("image/")) {
        Alert.alert("Invalid file", "Please choose a valid image.");
        return;
      }

      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      const uploadResp = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      if (!uploadResp.ok) {
        throw new Error(`Upload failed (${uploadResp.status})`);
      }
      const { storageId } = (await uploadResp.json()) as {
        storageId: string;
      };

      const url = await setAvatar({ storageId: storageId as any });
      if (url) {
        await appendHistory({ storageId: storageId as any, url });
      }

      reset();
      onClose();
      Alert.alert("Updated", "Profile picture changed.");
    } catch (err: any) {
      Alert.alert(
        "Upload failed",
        err?.message || "Something went wrong. Try again.",
        [
          { text: "Cancel", style: "cancel", onPress: () => setUploading(false) },
          { text: "Retry", onPress: confirmUpload },
        ]
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={closeAll}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={uploading ? undefined : closeAll}
      >
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          {/* Preview / confirm step */}
          {previewUri ? (
            <View style={styles.preview}>
              <Text style={styles.title}>Use this photo?</Text>
              <Image source={{ uri: previewUri }} style={styles.previewImage} />
              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnSecondary]}
                  onPress={reset}
                  disabled={uploading}
                >
                  <Text style={styles.btnSecondaryText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary, uploading && styles.btnDisabled]}
                  onPress={confirmUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Use Photo</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.avatarRow}>
                <View style={styles.currentAvatar}>
                  {currentUrl ? (
                    <Image
                      source={{ uri: currentUrl }}
                      style={styles.currentAvatarImg}
                    />
                  ) : (
                    <Text style={styles.currentAvatarText}>{initials}</Text>
                  )}
                </View>
                <Text style={styles.title}>Profile Picture</Text>
              </View>

              <TouchableOpacity style={styles.option} onPress={pickFromCamera}>
                <Ionicons name="camera" size={22} color={colors.text} />
                <Text style={styles.optionText}>Take Photo</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.option} onPress={pickFromLibrary}>
                <Ionicons name="image" size={22} color={colors.text} />
                <Text style={styles.optionText}>Choose from Gallery</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {history && history.length > 0 && (
                <View style={styles.historySection}>
                  <Text style={styles.historyLabel}>RECENTLY USED</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.historyRow}
                  >
                    {history.map((h) => (
                      <TouchableOpacity
                        key={h.storageId}
                        onPress={() => reuseHistoryItem(h.url)}
                        disabled={uploading}
                      >
                        <Image
                          source={{ uri: h.url }}
                          style={[
                            styles.historyImg,
                            currentUrl === h.url && styles.historyImgActive,
                          ]}
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <TouchableOpacity
                style={[styles.option, styles.cancel]}
                onPress={closeAll}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.select({ ios: 36, default: spacing.lg }),
    gap: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  avatarRow: {
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  currentAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary,
    overflow: "hidden",
  },
  currentAvatarImg: { width: "100%", height: "100%" },
  currentAvatarText: { color: colors.text, fontSize: 24, fontWeight: "800" },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
  },
  optionText: { flex: 1, color: colors.text, fontSize: fontSize.md, fontWeight: "500" },
  cancel: {
    backgroundColor: "transparent",
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
  historySection: { gap: spacing.sm, marginTop: spacing.sm },
  historyLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  historyRow: { gap: spacing.sm, paddingVertical: 4 },
  historyImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.border,
  },
  historyImgActive: { borderColor: colors.primary },
  preview: { gap: spacing.md, alignItems: "center" },
  previewImage: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  previewActions: { flexDirection: "row", gap: spacing.sm, width: "100%" },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: "700",
    letterSpacing: 1,
  },
  btnSecondary: { backgroundColor: colors.surfaceTertiary },
  btnSecondaryText: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  btnDisabled: { opacity: 0.5 },
});
