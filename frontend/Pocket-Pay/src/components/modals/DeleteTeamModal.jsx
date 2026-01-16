import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { AlertTriangle } from "lucide-react";

export function DeleteTeamModal({ teamName, onClose, onConfirm }) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (confirmText !== teamName) {
      return;
    }

    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      setIsDeleting(false);
    }
  };

  const isConfirmDisabled = confirmText !== teamName;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg max-w-md w-full p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold">팀 삭제</h2>
        </div>

        {/* Warning Messages */}
        <div className="space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-semibold">
              ⚠️ 경고: 이 작업은 되돌릴 수 없습니다!
            </p>
            <p className="text-sm text-red-700 mt-2">
              팀과 관련된 모든 거래 내역이 <strong>영구적으로 삭제</strong>
              됩니다.
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-semibold">
              ⚠️ 다시 한번 확인하세요!
            </p>
            <p className="text-sm text-red-700 mt-2">
              삭제된 데이터는 <strong>복구할 수 없으며</strong>, 모든 팀원의
              접근 권한도 즉시 제거됩니다.
            </p>
          </div>
        </div>

        {/* Team Name Input */}
        <div className="space-y-2">
          <Label htmlFor="confirm-team-name" className="text-sm">
            팀 이름을 입력하여 삭제를 확인하세요
          </Label>
          <Input
            id="confirm-team-name"
            type="text"
            placeholder={`예: ${teamName}`}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            정확히 "<strong>{teamName}</strong>"를 입력해주세요
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1"
          >
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isConfirmDisabled || isDeleting}
            className="flex-1"
          >
            {isDeleting ? "삭제 중..." : "팀 삭제"}
          </Button>
        </div>
      </div>
    </div>
  );
}
