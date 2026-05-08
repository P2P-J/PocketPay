import { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Check, X } from "lucide-react-native";
import { Input } from "@/components/ui/Input";
import { accountApi } from "@/api/account";

type Status = "idle" | "checking" | "available" | "format" | "taken";

type Props = {
  value: string;
  onChange: (handle: string) => void;
  /** 변경 안 한 본인 handle은 사용 가능으로 간주 */
  ownHandle?: string;
};

export function HandleInput({ value, onChange, ownHandle }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value) {
      setStatus("idle");
      return;
    }

    if (ownHandle && value.toLowerCase() === ownHandle.toLowerCase()) {
      setStatus("available");
      return;
    }

    setStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await accountApi.checkHandle(value);
        if (res.data.available) {
          setStatus("available");
        } else if (res.data.reason === "format") {
          setStatus("format");
        } else {
          setStatus("taken");
        }
      } catch {
        setStatus("idle");
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, ownHandle]);

  const message = (() => {
    switch (status) {
      case "checking":
        return null;
      case "available":
        return { text: "사용 가능해요", color: "#3DD598" };
      case "format":
        return {
          text: "영문 소문자, 숫자, 언더스코어만 가능 (3~20자)",
          color: "#EF4444",
        };
      case "taken":
        return { text: "이미 사용 중이에요", color: "#EF4444" };
      default:
        return null;
    }
  })();

  return (
    <View>
      <Input
        label="ID"
        value={value}
        onChangeText={(t) => onChange(t.toLowerCase())}
        placeholder="예: aen_kim"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
      />
      <View
        className="flex-row items-center mt-1"
        style={{ minHeight: 18, gap: 4 }}
      >
        {status === "checking" && (
          <ActivityIndicator size="small" color="#8B95A1" />
        )}
        {status === "available" && <Check size={14} color="#3DD598" />}
        {(status === "format" || status === "taken") && (
          <X size={14} color="#EF4444" />
        )}
        {message && (
          <Text style={{ color: message.color, fontSize: 12 }}>
            {message.text}
          </Text>
        )}
      </View>
    </View>
  );
}

export type HandleStatus = Status;
export const isHandleValid = (status: Status) => status === "available";
