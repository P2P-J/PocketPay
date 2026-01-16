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

  const [confirmMember, setConfirmMember] = useState(null);
  const [removeLoadingId, setRemoveLoadingId] = useState(null);
  const [inviteError, setInviteError] = useState("");

  const [error, setError] = useState("");


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


  useEffect(() => {
    if (open) {
      loadMembers(true);
    } else {
      setInviteMessage("");
      setError("");
      setInviteError("");
      setInviteEmail("");
    }
  }, [open, teamId]);


  const handleInviteClick = async () => {
  if (!inviteEmail.trim() || !teamId) return;

  setInviteLoading(true);
  setError("");
  setInviteMessage("");
  setInviteError("");      

  try {
    await teamApi.inviteMember(teamId, inviteEmail.trim());
    setInviteEmail("");

    await loadMembers(false);

    setInviteMessage("초대가 완료되었습니다.");
  } catch (err) {
    console.error("inviteMember error:", err);

    const msg =
      err?.response?.data?.message ||
      err.message ||
      "초대에 실패했습니다.";


    setInviteError(msg);
  } finally {
    setInviteLoading(false);
  }
};


  const handleInviteKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleInviteClick();
    }
  };


  const handleClickRemove = (member) => {
    if (!member?.user?._id) return;
    setConfirmMember(member);
  };


  const handleConfirmRemove = async () => {
    if (!teamId || !confirmMember) return;

    const memberUserId = confirmMember.user?._id;
    if (!memberUserId) return;

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


      setConfirmMember(null);
    } catch (err) {
      console.error("removeMember error:", err);
      setError(err.message || "추방에 실패했습니다.");
    } finally {
      setRemoveLoadingId(null);
    }
  };


  const handleCancelRemove = () => {
    setConfirmMember(null);
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)", 
            zIndex: 60,
          }}
        >
          <div className="relative bg-background rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
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
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setInviteError("");     
                    setInviteMessage("");
                  }}
                  onKeyDown={handleInviteKeyDown}
                  disabled={inviteLoading || !teamId}
                  onFocus={() => {
                    if (inviteError) {
                      setInviteError("");
                    }
                  }}
                  style={
                    inviteError
                      ? { borderColor: "#ef4444" } 
                      : undefined
                  }
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

              {inviteError ? (
                <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                  {inviteError}
                </p>
              ) : inviteMessage ? (
                <p className="text-xs text-emerald-500 mt-1">
                  {inviteMessage}
                </p>
              ) : null}
            </section>

            <section className="space-y-2 mt-4">
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
                            onClick={() => handleClickRemove(member)}
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
              <p className="text-xs text-red-500 mt-2">{error}</p>
            )}
          </div>
        </div>
      )}

      {open && confirmMember && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.4)", 
            zIndex: 70, 
          }}
        >
          <div
            className="rounded-xl shadow-lg w-[460px] max-w-md p-6 space-y-4 border"
            style={{
              backgroundColor: "#fef2f2",
              borderColor: "#fecaca",
            }}
          >
            <h3 className="text-base font-semibold">팀원 추방</h3>
            <p className="text-sm text-muted-foreground">
              정말로{" "}
              <span className="font-semibold">
                {confirmMember.user?.name ||
                  confirmMember.user?.email ||
                  "이 팀원"}
              </span>
              을(를) 팀에서 추방하시겠어요?
            </p>
            <p className="text-xs text-muted-foreground">
              이 작업은 되돌릴 수 없습니다.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                size="sm"
                onClick={handleCancelRemove}
                disabled={!!removeLoadingId}
                className="!bg-emerald-500 !text-white hover:!bg-emerald-600 disabled:opacity-60 disabled:hover:!bg-emerald-500"
              >
                취소
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmRemove}
                disabled={!!removeLoadingId}
              >
                {removeLoadingId ? "처리 중..." : "추방하기"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}