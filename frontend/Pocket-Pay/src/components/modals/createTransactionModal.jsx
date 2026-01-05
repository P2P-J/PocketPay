import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useAuthStore } from "../../store/authStore";
import { useTeamStore } from "../../store/teamStore";
import { X, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

export function CreateTransactionModal({
  form,
  mode,
  onChange,
  onClose,
  onSubmit,
}) {
  const { accessToken } = useAuthStore();
  const { currentTeam, categories, fetchCategories } = useTeamStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (accessToken && currentTeam) {
      fetchCategories(accessToken, currentTeam.id);
    }
  }, [accessToken, currentTeam]);

  const filteredCategories = categories.filter((cat) => cat.type === form.type);

  // 기본 카테고리
  const defaultCategories =
    form.type === "expense"
      ? [
          { id: "meal", name: "식비", color: "#FF6B6B" },
          { id: "transport", name: "교통비", color: "#4ECDC4" },
          { id: "supplies", name: "비품", color: "#95E1D3" },
          { id: "rent", name: "장소대관", color: "#FFD93D" },
          { id: "etc", name: "기타", color: "#A8DADC" },
        ]
      : [
          { id: "membership", name: "회비", color: "#4ADE80" },
          { id: "donation", name: "후원금", color: "#86EFAC" },
          { id: "event", name: "행사수입", color: "#22C55E" },
          { id: "etc-income", name: "기타수입", color: "#BBF7D0" },
        ];

  const displayCategories =
    filteredCategories.length > 0 ? filteredCategories : defaultCategories;

  const handleSubmitInternal = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {mode === "edit" ? "거래 수정" : "거래 추가"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmitInternal} className="p-6 space-y-4">
          {/* 거래처 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">거래처(상품) *</label>
            <Input
              type="text"
              placeholder="거래처 또는 상품명을 입력하세요"
              value={form.merchant}
              onChange={(e) => onChange("merchant", e.target.value)}
              required
            />
          </div>

          {/* 구분 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">구분 *</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={form.type === "income" ? "default" : "outline"}
                onClick={() => {
                  onChange("type", "income");
                  onChange("category", "");
                }}
              >
                수익
              </Button>
              <Button
                type="button"
                variant={form.type === "expense" ? "default" : "outline"}
                onClick={() => {
                  onChange("type", "expense");
                  onChange("category", "");
                }}
              >
                지출
              </Button>
            </div>
          </div>

          {/* 설명 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">설명</label>
            <Textarea
              placeholder="거래 내용을 입력하세요"
              value={form.description}
              onChange={(e) => onChange("description", e.target.value)}
              rows={3}
            />
          </div>

          {/* 카테고리 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">카테고리</label>
            <div className="grid grid-cols-2 gap-2">
              {displayCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onChange("category", category.id)}
                  className={`p-3 rounded-lg border transition-colors ${
                    form.category === category.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm">{category.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 금액 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">금액 *</label>
            <Input
              type="number"
              placeholder="0"
              value={form.amount}
              onChange={(e) => onChange("amount", e.target.value)}
              required
            />
          </div>

          {/* 날짜 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">날짜 *</label>
            <Popover>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Input
                    type="text"
                    value={
                      form.date
                        ? format(new Date(form.date), "yyyy년 MM월 dd일")
                        : ""
                    }
                    readOnly
                    placeholder="날짜를 선택하세요"
                    className="pr-10"
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.date ? new Date(form.date) : undefined}
                  onSelect={(newDate) =>
                    newDate && onChange("date", newDate.toISOString())
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              취소
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "저장 중..." : mode === "edit" ? "수정" : "추가"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
