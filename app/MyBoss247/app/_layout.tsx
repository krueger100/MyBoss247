import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Slot, useRouter, useSegments } from "expo-router";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { TamaguiProvider, Theme } from "tamagui";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";

import tamaguiConfig from "../tamagui.config";
import { tokenCache } from "../lib/tokenCache";
import { useSyncUser } from "../hooks/useSyncUser";
import { useCurrentUser } from "../hooks/useCurrentUser";

SplashScreen.preventAutoHideAsync();

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!clerkPublishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Set it in .env.local"
  );
}

/**
 * Auth-aware routing. Routes users between:
 *   - (auth) group when signed out
 *   - onboarding flow when Convex user has pending onboardingStep
 *   - (tabs) when fully onboarded
 */
function AuthenticatedLayout() {
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth();
  const { synced } = useSyncUser();
  const convexUser = useCurrentUser();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!clerkLoaded) return;

    const group = segments[0] as string | undefined;
    const inAuth = group === "(auth)";
    const inOnboarding = group === "onboarding";
    const inTabs = group === "(tabs)";

    // Not signed in
    if (!isSignedIn) {
      if (!inAuth) router.replace("/(auth)/login");
      return;
    }

    // Signed in — wait for Convex user sync before routing
    if (!synced || convexUser === undefined) return;

    // First-time user or mid-onboarding
    const needsOnboarding =
      convexUser === null ||
      (convexUser.onboardingStep && convexUser.onboardingStep !== "done");

    if (needsOnboarding) {
      if (!inOnboarding) router.replace("/onboarding/quick-start");
      return;
    }

    // Fully onboarded — route to tabs
    if (inAuth || inOnboarding) {
      router.replace("/(tabs)");
    }
  }, [isSignedIn, clerkLoaded, synced, convexUser, segments]);

  return (
    <>
      <Slot />
      <StatusBar style="light" />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({});

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}
