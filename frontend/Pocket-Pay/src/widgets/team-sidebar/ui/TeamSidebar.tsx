import { Button } from "@shared/ui/button";
import { useTeamStore } from "@features/team/model/teamStore";
import { useAuthStore } from "@features/auth/model/authStore";
import { Wallet } from "lucide-react";
import { getTeamId } from "@entities/team";

interface TeamSidebarProps {
  selectedTeamId?: string;
  onTeamSelect: (teamId: string | undefined) => void;
  onCreateTeam?: () => void;
}

export function TeamSidebar({ selectedTeamId, onTeamSelect, onCreateTeam }: TeamSidebarProps) {
  const { teams } = useTeamStore();
  const { user } = useAuthStore();

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
            ₩
          </div>
          <h1 className="text-xl">작은모임</h1>
        </div>
      </div>

      {/* Team List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {teams.map((team, index) => (
            <button
              key={getTeamId(team) || index}
              onClick={() => onTeamSelect(getTeamId(team))}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                selectedTeamId === getTeamId(team)
                  ? "bg-primary/10 border-2 border-primary"
                  : "hover:bg-muted"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                  team.color || "bg-primary"
                }`}
                style={{ backgroundColor: team.color }}
              >
                {team.name ? team.name[0] : "?"}
              </div>
              <span className="text-sm">{team.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Create Team Button */}
      {onCreateTeam && (
        <div className="p-4 border-t border-border">
          <Button onClick={onCreateTeam} className="w-full">
            + 새 모임 만들기
          </Button>
        </div>
      )}
    </div>
  );
}
