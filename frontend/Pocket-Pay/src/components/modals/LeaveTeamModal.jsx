import { useState } from "react";
import { Button } from "../ui/button";
import { useTeamStore } from "../../store/teamStore";
import { toast } from "sonner";

export function LeaveTeamModal({ isOpen, onClose, teamName, teamId }) {
  const { leaveTeam } = useTeamStore();
  const [isLeaving, setIsLeaving] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLeaving(true);
    try {
      await leaveTeam(teamId);
      toast.success("팀에서 나갔습니다.");
      onClose();
    } catch (err) {
      const errorMessage = err.message || "팀 나가기 중 오류가 발생했습니다.";
      toast.error(errorMessage);
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg max-w-md w-full p-6 space-y-4">
        <h2 className="text-2xl font-bold">팀 나가기</h2>
        <p className="text-sm text-muted-foreground">
          정말 <span className="font-semibold text-foreground">{teamName}</span>
          을(를) 나가시겠습니까?
        </p>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isLeaving}
          >
            취소
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleConfirm}
            disabled={isLeaving}
          >
            {isLeaving ? "처리 중..." : "확인"}
          </Button>
        </div>
      </div>
    </div>
  );
}
