import { useState } from "react";
import { View } from "react-native";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export type AccountValue = { bank: string; number: string; holder: string };

type Props = {
  initial?: AccountValue;
  saving?: boolean;
  onSave: (account: AccountValue) => void | Promise<void>;
  onCancel?: () => void;
};

export function AccountForm({ initial, saving, onSave, onCancel }: Props) {
  const [bank, setBank] = useState(initial?.bank ?? "");
  const [number, setNumber] = useState(initial?.number ?? "");
  const [holder, setHolder] = useState(initial?.holder ?? "");

  const isValid = !!(bank.trim() && number.trim() && holder.trim());

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      bank: bank.trim(),
      number: number.trim(),
      holder: holder.trim(),
    });
  };

  return (
    <View style={{ gap: 12 }}>
      <Input
        label="은행"
        placeholder="예: 국민, 신한, 토스뱅크"
        value={bank}
        onChangeText={setBank}
        maxLength={30}
      />
      <Input
        label="계좌번호"
        placeholder="예: 123-456-789012"
        value={number}
        onChangeText={setNumber}
        maxLength={50}
        keyboardType="number-pad"
      />
      <Input
        label="예금주"
        placeholder="홍길동"
        value={holder}
        onChangeText={setHolder}
        maxLength={30}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        {onCancel && (
          <View style={{ flex: 1 }}>
            <Button label="취소" variant="outline" size="md" onPress={onCancel} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Button
            label="저장"
            variant="primary"
            size="md"
            loading={saving}
            onPress={handleSave}
            disabled={!isValid}
          />
        </View>
      </View>
    </View>
  );
}
