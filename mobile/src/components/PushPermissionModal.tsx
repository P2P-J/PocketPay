import { View, Text, Modal, Pressable } from "react-native";
import { Bell } from "lucide-react-native";
import { Button } from "@/components/ui/Button";

type Props = {
  visible: boolean;
  onAllow: () => void;
  onSkip: () => void;
};

export function PushPermissionModal({ visible, onAllow, onSkip }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSkip}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
        onPress={onSkip}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 24,
            width: "100%",
            maxWidth: 360,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: "#E8FAF2",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Bell size={28} color="#3DD598" strokeWidth={2} />
          </View>
          <Text className="text-title font-pretendard-bold text-text-primary mb-2 text-center">
            알림 받기
          </Text>
          <Text className="text-body text-text-secondary text-center mb-6">
            모임 초대나 더치페이 요청을{"\n"}바로 알 수 있게 알림을 보내드릴까요?
          </Text>
          <View className="flex-row w-full" style={{ gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button
                label="나중에"
                variant="outline"
                size="md"
                onPress={onSkip}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="허용하기"
                variant="primary"
                size="md"
                onPress={onAllow}
              />
            </View>
          </View>
          <Text className="text-caption text-text-secondary mt-3 text-center">
            나중에 iOS 설정에서 변경할 수 있어요
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
