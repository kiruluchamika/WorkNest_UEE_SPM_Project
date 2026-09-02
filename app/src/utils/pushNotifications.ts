import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as pushNotificationApi from "../api/pushNotificationApi";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "WorkNest notifications",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0F766E",
      sound: "default",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  const projectId = getProjectId();
  if (!projectId) {
    console.warn("Expo project ID is missing; push notifications cannot be registered.");
    return null;
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await pushNotificationApi.registerPushToken(token);
    return token;
  } catch (err) {
    console.warn("Could not register push notifications:", err);
    return null;
  }
}

export async function unregisterPushTokenAsync(token: string | null): Promise<void> {
  if (!token) return;

  try {
    await pushNotificationApi.unregisterPushToken(token);
  } catch (err) {
    console.warn("Could not unregister push notifications:", err);
  }
}

export function addPushTokenRefreshListener(onToken: (token: string) => void) {
  if (Platform.OS === "web") return { remove: () => {} };

  return Notifications.addPushTokenListener(async ({ data }) => {
    await pushNotificationApi.registerPushToken(data);
    onToken(data);
  });
}

export function addForegroundNotificationListener(onReceive: () => void) {
  if (Platform.OS === "web") return { remove: () => {} };

  return Notifications.addNotificationReceivedListener(() => {
    onReceive();
  });
}

export interface PushNotificationData {
  notificationId?: string;
  type?: string;
  link?: string;
  relatedEntityId?: string;
}

function extractData(notification: Notifications.Notification): PushNotificationData {
  return (notification.request.content.data ?? {}) as PushNotificationData;
}

// Fires when the user taps a notification (app in foreground, background,
// or freshly launched by the tap). Does NOT fire for a true cold start —
// use getLastNotificationResponseAsync for that case.
export function addNotificationResponseListener(onResponse: (data: PushNotificationData) => void) {
  if (Platform.OS === "web") return { remove: () => {} };

  return Notifications.addNotificationResponseReceivedListener((response) => {
    onResponse(extractData(response.notification));
  });
}

// Checks whether the app was launched by tapping a notification (the
// process was not already running). Resolves to null otherwise.
export async function getLastNotificationResponseAsync(): Promise<PushNotificationData | null> {
  if (Platform.OS === "web") return null;

  const response = await Notifications.getLastNotificationResponseAsync();
  return response ? extractData(response.notification) : null;
}
