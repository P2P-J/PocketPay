import { useState } from "react";
import { Button } from "./ui/button";
import { useAuthStore } from "../store/authStore";
import { Users, Trash2 } from "lucide-react";
import { DeleteTeamModal } from "./modals/DeleteTeamModal";
import { TeamMemberManagerDialog } from "./TeamMemberManagerDialog";

export function MemberSidebar({ currentTeam, onDeleteTeam }) {
  const { user } = useAuthStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);

  if (!currentTeam) {
    return null;
  }

  // Check if current user is the owner
  const isOwner =
    currentTeam.owner === user?.userId ||
    currentTeam.owner?._id === user?.userId ||
    currentTeam.owner === user?._id;

  // Sort members by joinedAt (가입된 순서)
  const sortedMembers = currentTeam.members
    ? [...currentTeam.members].sort((a, b) => {
        const dateA = new Date(a.joinedAt || 0);
        const dateB = new Date(b.joinedAt || 0);
        return dateA - dateB;
      })
    : [];

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    await onDeleteTeam?.();
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
            const memberUser = member.user;
            const memberName = memberUser?.name || "알 수 없음";
            const memberRole = member.role;
            const isOwnerMember = memberRole === "owner";

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
                  {isOwnerMember && (
                    <div className="text-xs text-primary">Owner</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isOwner && (
        <div className="p-4 border-t border-border">
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleDeleteClick}
          >
            <Trash2 className="w-4 h-4 mr-2" />팀 삭제하기
          </Button>
        </div>
      )}

      {/* Delete Team Modal */}
      {showDeleteModal && (
        <DeleteTeamModal
          teamName={currentTeam.name}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>

      {/* 🔹 실제 팀원관리 모달 연결 */}
      <TeamMemberManagerDialog
        teamId={currentTeam._id || currentTeam.id}
        open={memberModalOpen}
        onOpenChange={setMemberModalOpen}
      />
    </>
  );
}
