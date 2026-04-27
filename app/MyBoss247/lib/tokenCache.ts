import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { type TokenCache } from "@clerk/clerk-expo/dist/cache";

/**
 * Clerk token cache using expo-secure-store for native platforms.
 * Falls back to no caching on web.
 */
const createTokenCache = (): TokenCache => {
  return {
    getToken: async (key: string) => {
      if (Platform.OS === "web") return null;
      try {
        const item = await SecureStore.getItemAsync(key);
        return item;
      } catch (error) {
        console.error("SecureStore getToken error:", error);
        await SecureStore.deleteItemAsync(key);
        return null;
      }
    },
    saveToken: async (key: string, token: string) => {
      if (Platform.OS === "web") return;
      try {
        await SecureStore.setItemAsync(key, token);
      } catch (error) {
        console.error("SecureStore saveToken error:", error);
      }
    },
    clearToken: async (key: string) => {
      if (Platform.OS === "web") return;
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        console.error("SecureStore clearToken error:", error);
      }
    },
  };
};

export const tokenCache = createTokenCache();
