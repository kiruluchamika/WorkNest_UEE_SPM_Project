import { prisma } from "../config/db";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const DEVICE_NOT_REGISTERED = "DeviceNotRegistered";

interface RegisterPushTokenInput {
  userId: string;
  token: string;
  platform?: string;
}

interface PushNotificationPayload {
  recipientId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

function isExpoPushToken(token: string): boolean {
  return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);
}

export async function registerPushToken({ userId, token, platform }: RegisterPushTokenInput) {
  if (!isExpoPushToken(token)) {
    throw new Error("Invalid Expo push token.");
  }

  const existing = await prisma.devicePushToken.findUnique({ where: { token } });
  if (existing) {
    return prisma.devicePushToken.update({
      where: { token },
      data: { userId, platform, isActive: true },
    });
  }

  return prisma.devicePushToken.create({ data: { userId, token, platform } });
}

export async function unregisterPushToken(userId: string, token: string) {
  const existing = await prisma.devicePushToken.findMany({
    where: { userId, token },
    select: { id: true },
  });

  await Promise.all(
    existing.map((deviceToken) =>
      prisma.devicePushToken.update({
        where: { id: deviceToken.id },
        data: { isActive: false },
      })
    )
  );
}

export async function sendPushNotification({ recipientId, title, body, data }: PushNotificationPayload) {
  const tokens = await prisma.devicePushToken.findMany({
    where: { userId: recipientId, isActive: true },
    select: { token: true },
  });

  if (tokens.length === 0) return;

  const messages = tokens.map(({ token }) => ({
    to: token,
    sound: "default",
    title,
    body,
    data,
  }));

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = (await response.json()) as { data?: ExpoPushTicket[]; errors?: unknown[] };
    if (!response.ok) {
      console.error("Expo push request failed:", result);
      return;
    }

    const inactiveTokens = result.data
      ?.map((ticket, index) => ({ ticket, token: tokens[index]?.token }))
      .filter(({ ticket, token }) => token && ticket.status === "error" && ticket.details?.error === DEVICE_NOT_REGISTERED)
      .map(({ token }) => token as string);

    if (inactiveTokens?.length) {
      await Promise.all(
        inactiveTokens.map((token) =>
          prisma.devicePushToken.update({
            where: { token },
            data: { isActive: false },
          })
        )
      );
    }
  } catch (err) {
    console.error("Failed to send push notification:", err);
  }
}
