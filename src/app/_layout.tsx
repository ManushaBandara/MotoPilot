import {
  DarkTheme,
  Stack,
  ThemeProvider,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { NavigationProvider } from "@/components/providers/navigation-provider";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <NavigationProvider>
        <AnimatedSplashOverlay />

        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="explore" />
          <Stack.Screen name="navigation" />
          <Stack.Screen name="rides" />
          <Stack.Screen name="media" />
          <Stack.Screen name="more" />
          <Stack.Screen name="camera-test" />
          <Stack.Screen name="compass-test" />
          <Stack.Screen name="fuel-test" />
          <Stack.Screen name="maintenance" />
          <Stack.Screen name="map-test" />
        </Stack>
      </NavigationProvider>
    </ThemeProvider>
  );
}