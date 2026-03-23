import ToastLib, { BaseToast, type BaseToastProps } from "react-native-toast-message";

const toastConfig = {
  success: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#3DD598",
        backgroundColor: "#FFFFFF",
        borderLeftWidth: 4,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}
      text1Style={{
        fontSize: 16,
        fontFamily: "Pretendard-SemiBold",
        color: "#191F28",
      }}
      text2Style={{
        fontSize: 14,
        fontFamily: "Pretendard",
        color: "#8B95A1",
      }}
    />
  ),
  error: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#F04452",
        backgroundColor: "#FFFFFF",
        borderLeftWidth: 4,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}
      text1Style={{
        fontSize: 16,
        fontFamily: "Pretendard-SemiBold",
        color: "#191F28",
      }}
      text2Style={{
        fontSize: 14,
        fontFamily: "Pretendard",
        color: "#8B95A1",
      }}
    />
  ),
  info: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#3182F6",
        backgroundColor: "#FFFFFF",
        borderLeftWidth: 4,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}
      text1Style={{
        fontSize: 16,
        fontFamily: "Pretendard-SemiBold",
        color: "#191F28",
      }}
      text2Style={{
        fontSize: 14,
        fontFamily: "Pretendard",
        color: "#8B95A1",
      }}
    />
  ),
};

export { toastConfig };

export function showToast(
  type: "success" | "error" | "info",
  text1: string,
  text2?: string
) {
  ToastLib.show({
    type,
    text1,
    text2,
    visibilityTime: 3000,
    topOffset: 60,
  });
}
