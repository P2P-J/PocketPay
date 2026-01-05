import { Button } from "./ui/button";
import { useAuthStore } from "../store/authStore";
import { User, ArrowLeft } from "lucide-react";

export function NavigationBar({
  activeTab,
  onTabChange,
  onAuthClick,
  onBack,
  showTabs = true,
}) {
  const { user } = useAuthStore();

  const tabs = [
    { id: "transactions", label: "거래 추가" },
    { id: "monthly", label: "월별 내역" },
    { id: "report", label: "보고서" },
    { id: "settings", label: "설정" },
  ];

  return (
    <nav className="bg-card border-b border-border">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left - Back Button (optional) */}
        <div className="flex items-center gap-4">
          {onBack && (
            <Button
              onClick={onBack}
              variant="ghost"
              size="sm"
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              홈으로 돌아가기
            </Button>
          )}
        </div>

        {/* Center - Navigation Tabs (optional) */}
        {showTabs && (
          <div className="flex-1 flex justify-center">
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Right - Auth Button */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs">
                {user.name?.[0] || user.email[0].toUpperCase()}
              </div>
              <span className="text-sm">{user.name || user.email}</span>
            </div>
          ) : (
            <Button onClick={onAuthClick} variant="outline" size="sm">
              <User className="w-4 h-4 mr-2" />
              로그인/회원가입
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
