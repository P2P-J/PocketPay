import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { teamApi } from "../api/team";

export function TeamMemberManagerDialog({ teamId, open, onOpenChange }) {
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");

  const [removeLoadingId, setRemoveLoadingId] = useState(null);
  const [error, setError] = useState("");

  // 팀원 목록 불러오기
  const loadMembers = async (showLoading = true) => {
    if (!teamId) return;

    if (showLoading) {
      setMembersLoading(true);
    }
    setError("");

    try {
      const res = await teamApi.getTeam(teamId);
      const team = res.data || res;
      const rawMembers = team.members || [];
      setMembers(rawMembers);
    } catch (err) {
      setError(err.message || "팀원 목록을 불러오지 못했습니다.");
    } finally {
      if (showLoading) {
        setMembersLoading(false);
      }
    }
  };

  // 모달 열릴 때만 목록 로드
  useEffect(() => {
    if (open) {
      loadMembers(true);
    } else {
      setInviteMessage("");
      setError("");
    }
  }, [open, teamId]);

  // 초대 버튼 클릭
  const handleInviteClick = async () => {
    if (!inviteEmail.trim() || !teamId) return;

    setInviteLoading(true);
    setError("");
    setInviteMessage("");

    try {
      await teamApi.inviteMember(teamId, inviteEmail.trim());
      setInviteEmail("");

      await loadMembers(false);

      setInviteMessage("초대가 완료되었습니다.");
    } catch (err) {
      console.error("inviteMember error:", err);
      setError(err.message || "초대에 실패했습니다.");
    } finally {
      setInviteLoading(false);
    }
  };

  // 엔터로도 초대
  const handleInviteKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleInviteClick();
    }
  };

  // 팀원 강퇴
  const handleRemove = async (member) => {
    if (!teamId || !member) return;

    // ✅ 백엔드가 기대하는 건 "유저 ID"라서 user._id 사용
    const memberUserId = member.user?._id;

    if (!memberUserId) return;

    if (!window.confirm("정말 이 팀원을 강퇴하시겠어요?")) return;

    setRemoveLoadingId(memberUserId);
    setError("");

    try {
      await teamApi.removeMember(teamId, memberUserId);
      setMembers((prev) =>
        prev.filter((m) => {
          const uid =
            m.user?._id || m.userId || m.user || m.id || m._id;
          return uid !== memberUserId;
        })
      );
    } catch (err) {
      console.error("removeMember error:", err);
      setError(err.message || "강퇴에 실패했습니다.");
    } finally {
      setRemoveLoadingId(null);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            {/* 헤더 */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">팀원 관리</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  팀원 초대와 추방(강퇴)을 이 화면에서 할 수 있어요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange?.(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {/* 팀원 초대 섹션 */}
            <section className="space-y-2">
              <h3 className="text-sm font-medium">팀원 초대</h3>
              <p className="text-xs text-muted-foreground">
                초대할 팀원의 이메일을 입력하면 초대가 전송됩니다.
              </p>

              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="invitee@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={handleInviteKeyDown}
                  disabled={inviteLoading || !teamId}
                />
                <Button
                  type="button"
                  className="whitespace-nowrap px-4"
                  disabled={inviteLoading || !inviteEmail.trim() || !teamId}
                  onClick={handleInviteClick}
                >
                  {inviteLoading ? "초대 중..." : "초대"}
                </Button>
              </div>

              {inviteMessage && (
                <p className="text-xs text-emerald-500 mt-1">
                  {inviteMessage}
                </p>
              )}
            </section>

            {/* 팀원 추방 섹션 */}
            <section className="space-y-2">
              <h3 className="text-sm font-medium">팀원 추방</h3>
              <p className="text-xs text-muted-foreground">
                팀에서 내보낼 멤버를 선택해 추방(강퇴)할 수 있습니다.
              </p>

              {membersLoading ? (
                <p className="text-xs text-muted-foreground">
                  팀원 목록을 불러오는 중입니다...
                </p>
              ) : members.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  현재 표시할 팀원이 없습니다.
                </p>
              ) : (
                <div
                  className="border rounded-md"
                  style={{
                    maxHeight: "300px",
                    overflowY: "auto",
                  }}
                >
                  <ul className="divide-y">
                    {members.map((member) => {
                      const userObj =
                        member.user && member.user._id ? member.user : null;

                      const displayName =
                        userObj?.name || member.name || "이름 없음";
                      const displayEmail =
                        userObj?.email || member.email || "이메일 정보 없음";
                      const role = member.role || "member";

                      const memberUserId =
                        userObj?._id || member.userId || member.user;
                      const isOwner = role === "owner";

                      return (
                        <li
                          key={memberUserId || `${displayEmail}-${role}`}
                          className="flex items-center justify-between px-3 py-2 text-sm"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {displayName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {displayEmail} · {role}
                            </span>
                          </div>

                          <Button
                            type="button"
                            variant="destructive"
                            size="xs"
                            onClick={() => handleRemove(member)}
                            disabled={
                              !memberUserId ||
                              removeLoadingId === memberUserId ||
                              isOwner
                            }
                          >
                            {removeLoadingId === memberUserId
                              ? "처리 중..."
                              : isOwner
                              ? "소유자"
                              : "추방"}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>

            {error && (
              <p className="text-xs text-red-500 mt-2">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}