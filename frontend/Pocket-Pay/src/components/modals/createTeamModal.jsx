import { useState } from "react";
import { Button } from "../ui/button";
import { useTeamStore } from "../../store/teamStore";

export function CreateTeamModal({ onClose }) {
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const { createTeam } = useTeamStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setIsLoading(true);
    try {
      await createTeam(teamName, description);
      onClose();
    } catch (error) {
      console.error("Failed to create team:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background rounded-lg max-w-md w-full p-6 space-y-4">
      <h2 className="text-2xl font-bold">새 팀 만들기</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">팀 이름</label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="예: 회식비 정산"
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">설명 (선택사항)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="팀에 대한 설명을 입력하세요"
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-20"
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
