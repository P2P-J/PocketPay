import { Button } from "./ui/button";
import { useAuthStore } from "../store/authStore";
import { User, ArrowLeft, Power } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

export function NavigationBar({
  activeTab,
  onTabChange,
  onAuthClick,
  onBack,
  showTabs = true,
}) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const handleLogout = () => {
    logout();
    navigate("/home");
  };

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

        {/* Right - User / Auth Button */}
        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs">
                    {user.name?.[0] || user.email[0].toUpperCase()}
                  </div>
                  <span className="text-sm">{user.name || user.email}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={handleProfileClick}
                  className="cursor-pointer flex items-center gap-2 text-sm hover:bg-muted hover:text-foreground mt-2"
                >
                  <User className="w-4 h-4" />
                  <span>프로필</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="mt-2 mb-2" />

                <DropdownMenuItem
                  onSelect={handleLogout}
                  className="cursor-pointer flex items-center gap-2 text-sm hover:bg-muted hover:text-foreground mb-2"
                >
                  <Power className="w-4 h-4" style={{ color: "#ef4444" }} />
                  <span style={{ color: "#ef4444" }}>로그아웃</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
