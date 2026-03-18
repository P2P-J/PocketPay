import { useNavigate } from "react-router-dom";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-8">
        페이지를 찾을 수 없습니다.
      </p>
      <button
        onClick={() => navigate("/home")}
        className="px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
      >
        홈으로 돌아가기
      </button>
    </div>
  );
}
