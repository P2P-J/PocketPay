import { X } from "lucide-react";
import { Button } from "./ui/button";

export function AuthScreen({ onClose }) {
  return (
    <div className="bg-background rounded-lg p-6">
      {/* Header with close button */}
      {onClose && (
        <div className="flex justify-end mb-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">PocketPay</h1>
        <p className="text-muted-foreground">로그인/가입 화면</p>
        <div className="space-y-2 pt-4">
          <Button className="w-full">로그인</Button>
          <Button variant="outline" className="w-full">
            회원가입
          </Button>
        </div>
      </div>
    </div>
  );
}
