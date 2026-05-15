import { Stack } from "expo-router";
import { colors } from "../../constants/theme";

export default function ContractLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        presentation: "modal",
        animation: "slide_from_bottom",
      }}
    />
  );
}
