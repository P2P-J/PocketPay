import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { useAuthStore } from "../store/authStore";
import { NavigationBar } from "../components/NavigationBar";
import { useNavigate } from "react-router-dom";

export function ProfilePage({ onBack }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleBack = onBack || (() => navigate(-1));

  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  // 사용자 정보 로드
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
      });
    }
  }, [user]);

  // 로그인 타입 결정
  const loginType = user?.provider || "local";

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = () => {
    // 비밀번호 변경 로직 추후 모달로 구현
    console.log("비밀번호 변경");
  };

  const handleDeleteAccount = () => {
    // 회원탈퇴 로직
    console.log("회원탈퇴");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // 프로필 수정 로직
    console.log("프로필 수정:", formData);
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

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium block">
                  이름
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="변경할 이름을 입력하세요"
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium block">
                  이메일
                </label>
                <input
                  id="email"
                  name="email"
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
                    onClick={handlePasswordChange}
                    className="w-full"
                  >
                    비밀번호 변경
                  </Button>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    className="flex-1"
                  >
                    회원탈퇴
                  </Button>

                  <Button type="submit" className="flex-1">
                    수정 완료
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
