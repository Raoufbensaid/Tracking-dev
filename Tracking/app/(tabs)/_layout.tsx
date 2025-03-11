import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false, // Masquer l'en-tête
        }}
      />
    </Stack>
  );
}
