import { useState } from "react";
import { Button } from "@shared/ui/button";
import { useAuthStore } from "@features/auth/model/authStore";
import { Users, Trash2, LogOut } from "lucide-react";
import { DeleteTeamModal } from "@features/team/ui/DeleteTeamModal";
import { LeaveTeamModal } from "@features/team/ui/LeaveTeamModal";
import { TeamMemberManagerDialog } from "@features/team/ui/TeamMemberManagerDialog";
import { getTeamId, isTeamOwner, sortMembersByJoinDate } from "@entities/team";

import type { Team } from "@entities/team/model";

interface MemberSidebarProps {
  currentTeam: Team | null;
  onDeleteTeam?: () => Promise<void>;
}

export function MemberSidebar({ currentTeam, onDeleteTeam }: MemberSidebarProps) {
  const { user } = useAuthStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);

  if (!currentTeam) {
    return null;
  }

  const isOwner = isTeamOwner(currentTeam.members, user);
  const sortedMembers = sortMembersByJoinDate(currentTeam.members);

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    await onDeleteTeam?.();
  };

  const handleLeaveClick = () => {
    setShowLeaveModal(true);
  };

  const handleManageMembersClick = () => {
    setMemberModalOpen(true);
  };

  return (
    <>
      <div className="w-64 bg-card border-l border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleManageMembersClick}
          >
            <Users className="w-4 h-4 mr-2" />
            팀원 관리
          </Button>
        </div>

        {/* Member List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              팀원 목록 ({sortedMembers.length}명)
            </h3>
            {sortedMembers.map((member, index) => {
              const memberUser = typeof member.user === "object" ? member.user : null;
              const memberName = memberUser?.name || "알 수 없음";
              const memberRole = member.role;

              return (
                <div
                  key={member._id || memberUser?._id || index}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-medium">
                    {memberName[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {memberName}
                    </div>
                    {memberRole && (
                      <div
                        className={`text-xs ${
                          memberRole === "owner"
                            ? "text-primary font-semibold"
                            : "text-muted-foreground"
                        }`}
                      >
                        {memberRole === "owner" ? "Owner" : "Member"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Owner: 팀 삭제하기 버튼 / Member: 팀 나가기 버튼 */}
        <div className="p-4 border-t border-border">
          {isOwner ? (
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDeleteClick}
            >
              <Trash2 className="w-4 h-4 mr-2" />팀 삭제하기
            </Button>
          ) : (
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleLeaveClick}
            >
              <LogOut className="w-4 h-4 mr-2" />팀 나가기
            </Button>
          )}
        </div>

        {/* Delete Team Modal */}
        {showDeleteModal && (
          <DeleteTeamModal
            teamName={currentTeam.name}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleConfirmDelete}
          />
        )}

        {/* Leave Team Modal */}
        {showLeaveModal && (
          <LeaveTeamModal
            isOpen={showLeaveModal}
            onClose={() => setShowLeaveModal(false)}
            teamName={currentTeam.name}
            teamId={getTeamId(currentTeam)}
          />
        )}
      </div>

      {/* 🔹 실제 팀원관리 모달 연결 */}
      <TeamMemberManagerDialog
        teamId={getTeamId(currentTeam)}
        open={memberModalOpen}
        onOpenChange={setMemberModalOpen}
      />
    </>
  );
}
