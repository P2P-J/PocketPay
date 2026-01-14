import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { useAuthStore } from "../store/authStore";
import { NavigationBar } from "../components/NavigationBar";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { changePassword, deleteAccount } from "../api/account";

export function ProfilePage({ onBack }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleBack = onBack || (() => navigate(-1));

  // 사용자 정보 (읽기 전용)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  useEffect(() => {
    console.log("ProfilePage useEffect: User changed", user);
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
      });
    }
  }, [user?.email, user?.name]);

  const loginType = user?.provider || "local";

  // --- 비밀번호 변경 모달 상태 및 로직 ---
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");

  const handlePasswordChangeClick = () => {
    console.log("Password Change Button Clicked");
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordError("");
    setIsPasswordOpen(true);
    console.log("Setting isPasswordOpen to true");
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("모든 필드를 입력해주세요.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      toast.success("비밀번호가 변경되었습니다.");
      setIsPasswordOpen(false);
    } catch (err) {
      setPasswordError(err.response?.data?.message || "비밀번호 변경 실패");
    }
  };

  // --- 회원탈퇴 모달 상태 및 로직 ---
  const [deleteStep, setDeleteStep] = useState(0); // 0: 닫힘, 1: 1차 확인, 2: 2차 확인

  const handleDeleteClick = () => {
    setDeleteStep(1);
  };

  const handleDeleteConfirmStep1 = () => {
    setDeleteStep(2);
  };

  const handleDeleteFinal = async () => {
    try {
      await deleteAccount();
      toast.success("정상적으로 회원 탈퇴 되었습니다.");
      logout();
      navigate("/home");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "회원 탈퇴 중 오류가 발생했습니다."
      );
      setDeleteStep(0);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <NavigationBar showTabs={false} onBack={handleBack} />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-lg shadow-lg p-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">프로필 설정</h1>
              <p className="text-muted-foreground">
                {loginType === "local"
                  ? "이메일 계정으로 로그인되어 있습니다"
                  : `${
                      loginType === "google" ? "구글" : "네이버"
                    } 계정으로 로그인되어 있습니다`}
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium block">이름</label>
                <input
                  type="text"
                  value={formData.name}
                  disabled
                  className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">이메일</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                />
              </div>

              <div className="pt-6 space-y-3">
                {loginType === "local" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePasswordChangeClick}
                    className="w-full"
                  >
                    비밀번호 변경
                  </Button>
                )}

                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteClick}
                  className="w-full"
                >
                  회원탈퇴
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 비밀번호 변경 모달 */}
      {isPasswordOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-2xl font-bold">비밀번호 변경</h2>
            <p className="text-sm text-muted-foreground">
              현재 비밀번호와 새 비밀번호를 입력해주세요.
            </p>

            <div className="space-y-4 py-2">
              <div>
                <input
                  name="currentPassword"
                  type="password"
                  placeholder="현재 비밀번호"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordInputChange}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <input
                  name="newPassword"
                  type="password"
                  placeholder="새 비밀번호"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordInputChange}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <input
                  name="confirmPassword"
                  type="password"
                  placeholder="새 비밀번호 확인"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordInputChange}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              {passwordError && (
                <p className="text-sm text-red-500">{passwordError}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsPasswordOpen(false)}
              >
                취소
              </Button>
              <Button className="flex-1" onClick={handlePasswordSubmit}>
                변경하기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 회원탈퇴 1차 모달 */}
      {deleteStep === 1 && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-2xl font-bold">회원탈퇴</h2>
            <p className="text-sm text-muted-foreground">
              정말로 회원을 탈퇴하시겠습니까?
              <br />
              개인정보 및 모임 데이터가 전부 삭제됩니다.
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteStep(0)}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDeleteConfirmStep1}
              >
                탈퇴하기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 회원탈퇴 2차 모달 */}
      {deleteStep === 2 && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-2xl font-bold">최종 확인</h2>
            <p className="text-sm font-medium text-red-500">
              정말로 회원을 탈퇴하시겠습니까?
              <br />이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로
              삭제됩니다.
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteStep(0)}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDeleteFinal}
              >
                확인
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
