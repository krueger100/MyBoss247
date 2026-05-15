import { useEffect } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useCurrentUser } from "./useCurrentUser";

/**
 * Registers the device for push notifications and saves the Expo push token
 * to Convex.
 *
 * IMPORTANT: expo-notifications throws on import in Expo Go (SDK 53+) because
 * remote push was removed. We avoid the import entirely when running in
 * Expo Go so the app doesn't crash. Once you do an EAS dev build, the import
 * happens and full push works.
 */
export function usePushNotifications() {
  const user = useCurrentUser();
  const registerToken = useMutation(api.notifications.registerPushToken);

  useEffect(() => {
    if (!user) return;
    // Skip everything when running in Expo Go
    if (Constants.appOwnership === "expo") return;

    let cancelled = false;

    (async () => {
      try {
        // Lazy require — only loads when NOT in Expo Go, avoiding the
        // import-time crash in expo-notifications/SDK 53+.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Notifications = require("expo-notifications");
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Device = require("expo-device");

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowAlert: true,
          }),
        });

        if (!Device.isDevice) return;

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#22C55E",
          });
        }

        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") return;

        const projectId =
          (Constants.expoConfig as any)?.extra?.eas?.projectId ??
          (Constants as any).easConfig?.projectId;

        const tokenResp = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        const token = tokenResp.data;

        if (cancelled || !token) return;
        await registerToken({ token });
      } catch (err) {
        console.warn("Push registration failed:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?._id]);
}
