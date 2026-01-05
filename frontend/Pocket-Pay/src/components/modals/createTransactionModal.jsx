import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Calendar } from "../ui/calendar";
import { Card } from "../ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useAuthStore } from "../../store/authStore";
import { useTeamStore } from "../../store/teamStore";
import {
    ArrowLeft,
    Camera,
    Upload,
    Calendar as CalendarIcon,
} from "lucide-react";
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
        <div className="fixed inset-0 z-50 flex h-screen bg-background">
            {/* 왼쪽 사이드바 공간 유지 */}
            <div className="w-64"></div>

            {/* 메인 콘텐츠 */}
            <div className="flex-1 overflow-auto">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-background border-b border-border">
                    <div className="max-w-4xl mx-auto px-6 py-4">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="rounded-full"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <h1 className="text-2xl">
                                {mode === "edit" ? "거래 수정" : "거래 추가"}
                            </h1>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto p-6 space-y-6">
                    {/* Receipt Upload - UI Only */}
                    <Card className="p-6 space-y-4">
                        <div className="text-center space-y-3">
                            <div className="flex justify-center">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <Camera className="w-8 h-8 text-primary" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-base">영수증으로 자동 입력</h3>
                                <p className="text-sm text-muted-foreground">
                                    영수증 사진을 업로드하면 자동으로 정보를 추출합니다
                                </p>
                            </div>
                            <Button type="button" variant="outline" className="w-full">
                                <Upload className="w-4 h-4 mr-2" />
                                영수증 업로드
                            </Button>
                        </div>
                    </Card>

                    {/* Manual Input Form */}
                    <form onSubmit={handleSubmitInternal} className="space-y-4">
                        <Card className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm text-muted-foreground">
                                    거래처(상품) *
                                </label>
                                <Input
                                    type="text"
                                    placeholder="거래처 또는 상품명을 입력하세요"
                                    value={form.merchant}
                                    onChange={(e) => onChange("merchant", e.target.value)}
                                    className="h-12 bg-input-background border-0 text-lg"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-muted-foreground">구분 *</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        type="button"
                                        variant={form.type === "income" ? "default" : "outline"}
                                        onClick={() => {
                                            onChange("type", "income");
                                            onChange("category", "");
                                        }}
                                        className={
                                            form.type === "income"
                                                ? "bg-chart-2 hover:bg-chart-2/90 font-semibold"
                                                : "font-semibold"
                                        }
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
                                        className={
                                            form.type === "expense" ? "font-semibold" : "font-semibold"
                                        }
                                    >
                                        지출
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-muted-foreground">설명</label>
                                <Textarea
                                    placeholder="거래 내용을 입력하세요"
                                    value={form.description}
                                    onChange={(e) => onChange("description", e.target.value)}
                                    className="min-h-20 bg-input-background border-0 resize-none"
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-muted-foreground">
                                    카테고리
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {displayCategories.map((category) => (
                                        <button
                                            key={category.id}
                                            type="button"
                                            onClick={() => onChange("category", category.id)}
                                            className={`p-3 rounded-lg border-2 transition-all ${form.category === category.id
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-primary/50"
                                                }`}
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <div
                                                    className="w-8 h-8 rounded-full"
                                                    style={{ backgroundColor: category.color }}
                                                />
                                                <span className="text-xs">{category.name}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-muted-foreground">금액 *</label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={form.amount}
                                    onChange={(e) => onChange("amount", e.target.value)}
                                    className="h-12 bg-input-background border-0 text-lg"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-muted-foreground">날짜 *</label>
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
                                                className="h-12 bg-input-background border-0 text-lg cursor-pointer"
                                                placeholder="날짜를 선택하세요"
                                            />
                                            <CalendarIcon className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
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
                        </Card>

                        <Button
                            type="submit"
                            className="w-full h-12 bg-primary hover:bg-primary/90"
                            disabled={loading}
                        >
                            {loading ? "저장 중..." : "저장하기"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
