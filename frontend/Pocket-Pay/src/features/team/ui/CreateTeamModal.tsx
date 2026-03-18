import { useState } from "react";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Textarea } from "@shared/ui/textarea";
import { Label } from "@shared/ui/label";
import { useTeamStore } from "@features/team/model/teamStore";
import { toast } from "sonner";

interface CreateTeamModalProps {
  onClose: () => void;
}

export function CreateTeamModal({ onClose }: CreateTeamModalProps) {
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const { createTeam } = useTeamStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setIsLoading(true);
    try {
      await createTeam(teamName, description);
      onClose();
    } catch (error: unknown) {
      toast.error((error as { message?: string }).message || "팀 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background rounded-lg max-w-md w-full p-6 space-y-4">
      <h2 className="text-2xl font-bold">새 팀 만들기</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>팀 이름</Label>
          <Input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="예: 회식비 정산"
          />
        </div>

        <div className="space-y-2">
          <Label>설명 (선택사항)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="팀에 대한 설명을 입력하세요"
            className="min-h-20"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            취소
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !teamName.trim()}
            className="flex-1"
          >
            {isLoading ? "생성 중..." : "팀 만들기"}
          </Button>
        </div>
      </form>
    </div>
  );
}
