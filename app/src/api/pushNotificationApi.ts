import { Platform } from "react-native";
import { http, extractErrorMessage } from "./http";

export async function registerPushToken(token: string): Promise<void> {
  try {
    await http.post("/notifications/push-token", { token, platform: Platform.OS });
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not register push notifications."));
  }
}

export async function unregisterPushToken(token: string): Promise<void> {
  try {
    await http.delete("/notifications/push-token", { data: { token } });
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not unregister push notifications."));
  }
}
