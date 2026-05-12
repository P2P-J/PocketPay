import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { accountApi } from "@/api/account";

/**
 * 권한 요청 + Expo Push Token 발급.
 * 시뮬레이터는 null 반환 (푸시 안 받음).
 * 권한 거절 시 null 반환.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig
      ?.projectId;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenData.data;
  } catch (e) {
    if (__DEV__) console.warn("getExpoPushTokenAsync failed", e);
    return null;
  }
}

/**
 * 토큰 발급 + 백엔드에 등록 (idempotent).
 */
export async function registerAndUploadToken(): Promise<string | null> {
  const token = await registerForPushNotifications();
  if (!token) return null;
  try {
    await accountApi.registerPushToken(token);
    return token;
  } catch (e) {
    if (__DEV__) console.warn("registerPushToken upload failed", e);
    return null;
  }
}
