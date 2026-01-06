import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAuthStore } from "../store/authStore";

export function AuthScreen({ onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });
  const { login, signup, loading } = useAuthStore();
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        if (onClose) onClose();
      } else {
        await signup(formData.name, formData.email, formData.password);
        // Auto login after signup or switch to login?
        // Let's try auto login
        await login(formData.email, formData.password);
        if (onClose) onClose();
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    }
  };

  return (
    <div className="bg-background rounded-lg p-6 w-full max-w-md">
      {/* Header with close button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {isLogin ? "로그인" : "회원가입"}
        </h1>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="space-y-2">
            <label className="text-sm font-medium">이름</label>
            <Input
              name="name"
              placeholder="이름을 입력하세요"
              value={formData.name}
              onChange={handleChange}
              required={!isLogin}
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">이메일</label>
          <Input
            name="email"
            type="email"
            placeholder="example@email.com"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">비밀번호</label>
          <Input
            name="password"
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="pt-2">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "처리중..." : isLogin ? "로그인" : "가입하기"}
          </Button>
        </div>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm text-muted-foreground hover:text-primary underline"
        >
          {isLogin
            ? "계정이 없으신가요? 회원가입"
            : "이미 계정이 있으신가요? 로그인"}
        </button>
      </div>
    </div>
  );
}
