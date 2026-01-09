// src/components/AuthScreen.jsx
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "../store/authStore";

export function AuthScreen({ onClose }) {
  const [mode, setMode] = React.useState("select");

  // SNS 로그인 버튼 핸들러
  const handleGoogleLogin = () => {
    window.location.href = "/auth/login/oauth/google";
  };

  const handleNaverLogin = () => {
    window.location.href = "/auth/login/oauth/naver";
  };

  const handleBackToSelect = () => setMode("select");

  return (
    <div className="w-full max-w-md mx-auto">
      {/* 상단 헤더 영역 */}
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

      {/* 본문 영역 */}
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

/**
 * 1단계: 로그인 / 회원가입 선택 화면 + SNS 버튼
 */
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

      {/* 이메일 로그인 / 회원가입 버튼 */}
      <div className="space-y-3">
        <Button variant="default" className="w-full" onClick={onSelectLogin}>
          이메일로 로그인
        </Button>
        <Button variant="outline" className="w-full" onClick={onSelectSignup}>
          이메일로 회원가입
        </Button>
      </div>

      {/* 구분선 */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">
          또는 SNS 계정으로 계속하기
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* 동그라미 SNS 아이콘 버튼들 */}
      <div className="flex items-center justify-center gap-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full w-11 h-11 p-0 bg-white shadow-sm hover:shadow-md"
          onClick={onGoogleLogin}
        >
          <img
            src="/google-logo.svg"
            alt="Google"
            className="w-5 h-5"
          />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full w-11 h-11 p-0 bg-white shadow-sm hover:shadow-md"
          onClick={onNaverLogin}
        >
          <img
            src="/naver-logo.svg"
            alt="Naver"
            className="w-5 h-5"
          />
        </Button>
      </div>
    </div>
  );
}

/**
 * 로그인 폼
 */
function LoginForm({ onBack, onClose }) {
  const { login } = useAuthStore();
  const [form, setForm] = React.useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(form.email, form.password);
      onClose?.();
    } catch (err) {
      const message = err?.message;

      if (message === "존재하지 않는 사용자") {
        alert("가입되지 않은 이메일입니다.");
      } else if (message === "비밀번호 불일치") {
        alert("비밀번호가 일치하지 않습니다.");
      } else {
        alert(message || "로그인 중 오류가 발생했습니다.");
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

      <div className="space-y-2">
        <Label htmlFor="login-email">이메일</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          placeholder="team@example.com"
          value={form.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password">비밀번호</Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          placeholder="비밀번호를 입력하세요"
          value={form.password}
          onChange={handleChange}
          required
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "로그인 중..." : "로그인"}
      </Button>
    </form>
  );
}

/**
 * 회원가입 폼
 */
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
        <Label htmlFor="signup-name">이름 / 팀명</Label>
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
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "회원가입 중..." : "회원가입"}
      </Button>
    </form>
  );
}