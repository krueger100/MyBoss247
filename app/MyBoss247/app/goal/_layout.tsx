import { Stack } from "expo-router";
import { colors } from "../../constants/theme";

export default function GoalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    />
  );
}
