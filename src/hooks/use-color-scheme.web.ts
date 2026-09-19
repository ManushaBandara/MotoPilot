import { useColorScheme as useRNColorScheme } from "react-native";

/**
 * Web color scheme hook.
 *
 * MotoPilot is primarily an Android application,
 * but this keeps the web version compatible.
 */
export function useColorScheme() {
  return useRNColorScheme() ?? "light";
}