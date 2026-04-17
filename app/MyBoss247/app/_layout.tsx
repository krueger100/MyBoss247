import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Slot, useRouter, useSegments } from "expo-router";
import { ClerkProvider, ClerkLoaded, useAuth, useUser } from "@clerk/expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { TamaguiProvider, Theme } from "tamagui";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

import tamaguiConfig from "../tamagui.config";
import { tokenCache } from "../lib/tokenCache";

// Prevent splash screen from hiding until we're ready
SplashScreen.preventAutoHideAsync();

// Initialize Convex client (outside component to avoid recreation)
const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL!
);

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!clerkPublishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Set it in .env.local"
  );
}

/**
 * Auth-aware routing: redirects to (auth) or (tabs) based on Clerk auth state.
 */
function AuthenticatedLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isSignedIn && !inAuthGroup) {
      // Not signed in and not on auth screen -> redirect to login
      router.replace("/(auth)/login");
    } else if (isSignedIn && inAuthGroup) {
      // Signed in but on auth screen -> redirect to dashboard
      router.replace("/(tabs)");
    }
  }, [isSignedIn, isLoaded, segments]);

  return (
    <>
      <Slot />
      <StatusBar style="light" />
    </>
  );
}

/**
 * Root layout: sets up the full provider chain.
 * ClerkProvider -> ConvexProviderWithClerk -> TamaguiProvider
 */
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Add custom fonts here if needed in the future
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      tokenCache={tokenCache}
    >
      <ClerkLoaded>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
            <Theme name="dark">
              <AuthenticatedLayout />
            </Theme>
          </TamaguiProvider>
        </ConvexProviderWithClerk>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
