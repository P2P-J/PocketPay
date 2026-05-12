import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { registerAndUploadToken } from "@/lib/push";

const ASKED_KEY = "pushPermissionAsked";

/**
 * 지연 권한 요청 패턴 — 사용자가 가치 인지 시점에 안내 모달 띄움.
 * 한 번 묻고 나면 (허용/거절 무관) 다시 안 물음.
 */
export function usePushPermission() {
  const [shouldShowModal, setShouldShowModal] = useState(false);

  const checkAndPromptIfNeeded = useCallback(async () => {
    const asked = await AsyncStorage.getItem(ASKED_KEY);
    if (asked === "true") return;

    const { status } = await Notifications.getPermissionsAsync();

    if (status === "granted") {
      // 이미 허용된 상태 (다른 경로) — 토큰만 등록 + asked 마킹
      await registerAndUploadToken();
      await AsyncStorage.setItem(ASKED_KEY, "true");
      return;
    }

    if (status === "denied") {
      // iOS는 한 번 거절하면 다시 못 물음. asked만 마킹
      await AsyncStorage.setItem(ASKED_KEY, "true");
      return;
    }

    // status === "undetermined" — 안내 모달 띄움
    setShouldShowModal(true);
  }, []);

  const handleAllow = useCallback(async () => {
    setShouldShowModal(false);
    await AsyncStorage.setItem(ASKED_KEY, "true");
    await registerAndUploadToken();
  }, []);

  const handleSkip = useCallback(async () => {
    setShouldShowModal(false);
    await AsyncStorage.setItem(ASKED_KEY, "true");
  }, []);

  return { shouldShowModal, checkAndPromptIfNeeded, handleAllow, handleSkip };
}
