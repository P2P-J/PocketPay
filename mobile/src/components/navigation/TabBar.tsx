import { memo } from "react";
import { View, Pressable, Platform } from "react-native";
import {
  Home,
  ArrowLeftRight,
  Plus,
  Clock,
  MoreHorizontal,
} from "lucide-react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  interpolateColor,
} from "react-native-reanimated";

const ACTIVE_COLOR = "#3DD598";
const INACTIVE_COLOR = "#B0B8C1";

type TabItem = {
  index: number;
  label: string;
  Icon: typeof Home;
};

const TABS: TabItem[] = [
  { index: 0, label: "홈", Icon: Home },
  { index: 1, label: "거래", Icon: ArrowLeftRight },
  { index: 2, label: "내역", Icon: Clock },
  { index: 3, label: "더보기", Icon: MoreHorizontal },
];

type Props = {
  progress: SharedValue<number>;
  onTabPress: (index: number) => void;
  onAddPress: () => void;
};

function TabBarInner({ progress, onTabPress, onAddPress }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        height: Platform.OS === "ios" ? 83 : 64,
        paddingBottom: Platform.OS === "ios" ? 34 : 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#E5E8EB",
        backgroundColor: "#FFFFFF",
      }}
    >
      <TabSlot tab={TABS[0]} progress={progress} onPress={onTabPress} />
      <TabSlot tab={TABS[1]} progress={progress} onPress={onTabPress} />
      <AddSlot onPress={onAddPress} />
      <TabSlot tab={TABS[2]} progress={progress} onPress={onTabPress} />
      <TabSlot tab={TABS[3]} progress={progress} onPress={onTabPress} />
    </View>
  );
}

type TabSlotProps = {
  tab: TabItem;
  progress: SharedValue<number>;
  onPress: (index: number) => void;
};

function TabSlot({ tab, progress, onPress }: TabSlotProps) {
  const animatedLabelStyle = useAnimatedStyle(() => {
    const distance = Math.min(Math.abs(progress.value - tab.index), 1);
    return {
      color: interpolateColor(
        distance,
        [0, 1],
        [ACTIVE_COLOR, INACTIVE_COLOR]
      ),
    };
  });

  return (
    <Pressable
      onPress={() => onPress(tab.index)}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <View style={{ marginTop: 2 }}>
        <tab.Icon size={24} color={INACTIVE_COLOR} strokeWidth={2} />
      </View>
      <Animated.Text
        style={[
          {
            fontSize: 10,
            fontFamily: "Pretendard-Medium",
            marginTop: -2,
          },
          animatedLabelStyle,
        ]}
      >
        {tab.label}
      </Animated.Text>
    </Pressable>
  );
}

function AddSlot({ onPress }: { onPress: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Pressable
        onPress={onPress}
        style={{
          top: -16,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: ACTIVE_COLOR,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: ACTIVE_COLOR,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

export const TabBar = memo(TabBarInner);
