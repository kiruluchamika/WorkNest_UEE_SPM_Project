import { Alert, Platform } from "react-native";

/**
 * Alert.alert's multi-button form never resolves on web (react-native-web
 * stubs Alert.alert as a no-op), so a confirm dialog gated behind it would
 * silently swallow the action. This picks window.confirm on web and the
 * native Alert everywhere else.
 */
export function confirmAction(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
  options?: { destructive?: boolean }
) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: confirmLabel, style: options?.destructive ? "destructive" : "default", onPress: onConfirm },
  ]);
}
