import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "../store/authStore";

export function AuthScreen({ onClose }) {
  const [mode, setMode] = React.useState("select");

  const handleGoogleLogin = () => {
    window.location.href = "/auth/login/oauth/google";
  };

  const handleNaverLogin = () => {
    window.location.href = "/auth/login/oauth/naver";
  };

  const handleBackToSelect = () => setMode("select");

  return (
    <div className="w-full max-w-md mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-lg font-semibold">
          {mode === "login"
            ? "로그인"
            : mode === "signup"
            ? "회원가입"
            : "포켓페이에 로그인 / 회원가입"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* 본문 */}
      <div className="p-6">
        {mode === "select" && (
          <SelectAuthMode
            onSelectLogin={() => setMode("login")}
            onSelectSignup={() => setMode("signup")}
            onGoogleLogin={handleGoogleLogin}
            onNaverLogin={handleNaverLogin}
          />
        )}

        {mode === "login" && (
          <LoginForm onBack={handleBackToSelect} onClose={onClose} />
        )}

        {mode === "signup" && (
          <SignupForm onBack={handleBackToSelect} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

/* 로그인 / 회원가입 선택 + SNS */
function SelectAuthMode({
  onSelectLogin,
  onSelectSignup,
  onGoogleLogin,
  onNaverLogin,
}) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        포켓페이 팀 계정에 로그인하거나 회원가입하세요.
      </p>

      <div className="space-y-3">
        <Button variant="default" className="w-full" onClick={onSelectLogin}>
          이메일로 로그인
        </Button>
        <Button variant="outline" className="w-full" onClick={onSelectSignup}>
          이메일로 회원가입
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">
          또는 SNS 계정으로 계속하기
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full w-11 h-11 p-0 bg-white shadow-sm hover:shadow-md"
          onClick={onGoogleLogin}
        >
          <img src="/google-logo.svg" alt="Google" className="w-5 h-5" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full w-11 h-11 p-0 bg-white shadow-sm hover:shadow-md"
          onClick={onNaverLogin}
        >
          <img src="/naver-logo.svg" alt="Naver" className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

/* 로그인 폼 */
function LoginForm({ onBack, onClose }) {
  const { login } = useAuthStore();
  const [form, setForm] = React.useState({ email: "", password: "" });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [errorField, setErrorField] = React.useState(null); // 🔴 어떤 필드가 에러인지

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFieldFocus = (field) => {
    if (error && errorField === field) {
      setError("");
      setErrorField(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setErrorField(null);
    setLoading(true);

    try {
      await login(form.email, form.password);
      onClose?.();
    } catch (err) {
      const message = err?.message;

      if (message === "존재하지 않는 사용자입니다.") {
        setError("가입되지 않은 이메일입니다.");
        setErrorField("email");
      } else if (message === "비밀번호 일치하지 않습니다.") {
        setError("비밀번호가 일치하지 않습니다.");
        setErrorField("password");
      } else {
        setError(message || "로그인 중 오류가 발생했습니다.");
        setErrorField(null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-muted-foreground mb-1 hover:underline"
      >
        ← 로그인 / 회원가입 선택으로 돌아가기
      </button>

      {/* 이메일 */}
      <div className="space-y-2">
        <Label htmlFor="login-email">이메일</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          placeholder="team@example.com"
          value={form.email}
          onChange={handleChange}
          onFocus={() => handleFieldFocus("email")}
          style={
            errorField === "email" ? { borderColor: "#ef4444" } : undefined
          }
          required
        />
      </div>

      {/* 비밀번호 */}
      <div className="space-y-2">
        <Label htmlFor="login-password">비밀번호</Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          placeholder="비밀번호를 입력하세요"
          value={form.password}
          onChange={handleChange}
          onFocus={() => handleFieldFocus("password")}
          style={
            errorField === "password" ? { borderColor: "#ef4444" } : undefined
          }
          required
        />
        {error && (
          <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
            {error}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "로그인 중..." : "로그인"}
      </Button>
    </form>
  );
}

/* 회원가입 폼 */
function SignupForm({ onBack, onClose }) {
  const { signup, login } = useAuthStore();
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);

    try {
      await signup(form.name, form.email, form.password);
      await login(form.email, form.password);
      onClose?.();
    } catch (err) {
      setError(err.message || "회원가입 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-muted-foreground mb-1 hover:underline"
      >
        ← 로그인 / 회원가입 선택으로 돌아가기
      </button>

      <div className="space-y-2">
        <Label htmlFor="signup-name">이름</Label>
        <Input
          id="signup-name"
          name="name"
          type="text"
          placeholder="이름을 입력해주세요."
          value={form.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email">이메일</Label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          placeholder="이메일을 입력해주세요."
          value={form.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password">비밀번호</Label>
        <Input
          id="signup-password"
          name="password"
          type="password"
          placeholder="비밀번호를 입력해주세요."
          value={form.password}
          onChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password-confirm">비밀번호 확인</Label>
        <Input
          id="signup-password-confirm"
          name="passwordConfirm"
          type="password"
          placeholder="비밀번호를 다시 입력해주세요."
          value={form.passwordConfirm}
          onChange={handleChange}
          required
        />
        {error && (
          <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
            {error}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "회원가입 중..." : "회원가입"}
      </Button>
    </form>
  );
}

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    </div>
  );
}
