import ToastLib, { BaseToast, type BaseToastProps } from "react-native-toast-message";

const baseStyle = {
  backgroundColor: "#FFFFFF",
  borderLeftWidth: 4,
  borderRadius: 12,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 4,
};

const text1Style = {
  fontSize: 16,
  fontFamily: "Pretendard-SemiBold",
  color: "#191F28",
};

const text2Style = {
  fontSize: 14,
  fontFamily: "Pretendard",
  color: "#8B95A1",
};

function createToast(borderLeftColor: string) {
  return (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{ ...baseStyle, borderLeftColor }}
      text1Style={text1Style}
      text2Style={text2Style}
    />
  );
}

const toastConfig = {
  success: createToast("#3DD598"),
  error: createToast("#F04452"),
  info: createToast("#3182F6"),
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
