import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Card } from "../ui/card";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useAuthStore } from "../../store/authStore";
import { useTeamStore } from "../../store/teamStore";
import {
    ArrowLeft,
    Camera,
    Upload,
    Calendar as CalendarIcon,
} from "lucide-react";
import { projectId } from "../../utils/supabase/info";
import { format } from "date-fns";
import "./createTransactionModal.css";

export function AddTransactionScreen({ onBack }) {
    const [type, setType] = useState("expense");
    const [storeName, setStoreName] = useState(""); // 거래처(상품)
    const [price, setPrice] = useState("");
    const [description, setDescription] = useState(""); // 설명
    const [categoryId, setCategoryId] = useState("");
    const [businessNumber, setBusinessNumber] = useState(""); // 사업자번호
    const [date, setDate] = useState(new Date());
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const { accessToken } = useAuthStore();
    const { currentTeam, categories, fetchCategories, createTransaction } =
        useTeamStore();

    useEffect(() => {
        if (accessToken && currentTeam) {
            fetchCategories(accessToken, currentTeam.id);
        }
    }, [accessToken, currentTeam]);

    const filteredCategories = categories.filter((cat) => cat.type === type);

    // 기본 카테고리 예시
    const defaultCategories =
        type === "expense"
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

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !accessToken || !currentTeam) return;

        setUploading(true);
        setError("");

        try {
            // Upload receipt
            const formData = new FormData();
            formData.append("file", file);
            formData.append("team_id", currentTeam.id);

            const uploadResponse = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-ef8e7ba7/receipts/upload`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: formData,
                }
            );

            if (!uploadResponse.ok) {
                throw new Error("영수증 업로드에 실패했습니다");
            }

            const { signedUrl } = await uploadResponse.json();

            // Call OCR API
            const ocrResponse = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-ef8e7ba7/ocr`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({ imageUrl: signedUrl }),
                }
            );

            if (!ocrResponse.ok) {
                throw new Error("OCR 처리에 실패했습니다");
            }

            const { data: ocrData } = await ocrResponse.json();

            // Auto-fill form with OCR data
            if (ocrData.store_name) {
                setStoreName(ocrData.store_name);
            }
            if (ocrData.price) {
                setPrice(String(ocrData.price));
            }
            if (ocrData.receipt_date) {
                setDate(new Date(ocrData.receipt_date));
            }

            alert("영수증 정보를 불러왔습니다. 내용을 확인하고 저장해주세요.");
        } catch (err) {
            console.error("Receipt upload error:", err);
            setError(err.message || "영수증 처리 중 오류가 발생했습니다");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!currentTeam) {
            setError("모임 정보가 없습니다");
            return;
        }

        if (!price || parseFloat(price) <= 0) {
            setError("금액을 입력해주세요");
            return;
        }

        setError("");
        setLoading(true);

        try {
            await createTransaction(accessToken || "", {
                team_id: currentTeam.id,
                type,
                price: parseFloat(price),
                store_name: storeName || undefined,
                description: description || undefined,
                transaction_date: format(date, "yyyy-MM-dd"),
                category_id: categoryId || undefined,
                business_number: businessNumber || undefined,
            });

            // 성공 메시지 표시
            alert("거래가 추가되었습니다!");
            onBack();
        } catch (err) {
            console.error("Transaction error:", err);
            setError(err.message || "거래 추가에 실패했습니다");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="transaction-screen">
            {/* 왼쪽 사이드바 공간 유지 */}
            <div className="transaction-sidebar-spacer"></div>

            {/* 메인 콘텐츠 */}
            <div className="transaction-main">
                {/* Header */}
                <div className="transaction-header">
                    <div className="transaction-header-content">
                        <div className="transaction-header-inner">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onBack}
                                className="transaction-back-btn"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <h1 className="transaction-title">거래 추가</h1>
                        </div>
                    </div>
                </div>

                <div className="transaction-content">
                    {/* Receipt Upload */}
                    <Card className="receipt-upload-card">
                        <div className="receipt-upload-content">
                            <div className="receipt-icon-container">
                                <div className="receipt-icon-wrapper">
                                    <Camera className="receipt-icon" />
                                </div>
                            </div>
                            <div>
                                <h3 className="receipt-title">영수증으로 자동 입력</h3>
                                <p className="receipt-description">
                                    영수증 사진을 업로드하면 자동으로 정보를 추출합니다
                                </p>
                            </div>
                            <label className="receipt-upload-label">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="receipt-upload-input"
                                    disabled={uploading}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="receipt-upload-btn"
                                    disabled={uploading}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        const input = e.currentTarget.previousElementSibling;
                                        input?.click();
                                    }}
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    {uploading ? "처리 중..." : "영수증 업로드"}
                                </Button>
                            </label>
                        </div>
                    </Card>

                    {/* Manual Input Form */}
                    <form onSubmit={handleSubmit} className="transaction-form">
                        <Card className="transaction-form-card">
                            <div className="form-field">
                                <label className="form-label">
                                    거래처(상품) *
                                </label>
                                <Input
                                    type="text"
                                    placeholder="거래처 또는 상품명을 입력하세요"
                                    value={storeName}
                                    onChange={(e) => setStoreName(e.target.value)}
                                    className="form-input"
                                    required
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">구분 *</label>
                                <div className="type-toggle-grid">
                                    <Button
                                        type="button"
                                        variant={type === "income" ? "default" : "outline"}
                                        onClick={() => {
                                            setType("income");
                                            setCategoryId("");
                                        }}
                                        className={
                                            type === "income"
                                                ? "type-toggle-income"
                                                : "type-toggle-expense"
                                        }
                                    >
                                        수익
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={type === "expense" ? "default" : "outline"}
                                        onClick={() => {
                                            setType("expense");
                                            setCategoryId("");
                                        }}
                                        className="type-toggle-expense"
                                    >
                                        지출
                                    </Button>
                                </div>
                            </div>

                            <div className="form-field">
                                <label className="form-label">설명</label>
                                <Textarea
                                    placeholder="거래 내용을 입력하세요"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="form-textarea"
                                    rows={3}
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">
                                    카테고리
                                </label>
                                <div className="category-grid">
                                    {displayCategories.map((category) => (
                                        <button
                                            key={category.id}
                                            type="button"
                                            onClick={() => setCategoryId(category.id)}
                                            className={`category-button ${categoryId === category.id
                                                ? "category-button-active"
                                                : "category-button-inactive"
                                                }`}
                                        >
                                            <div className="category-content">
                                                <div
                                                    className="category-color"
                                                    style={{ backgroundColor: category.color }}
                                                />
                                                <span className="category-name">{category.name}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-field">
                                <label className="form-label">금액 *</label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="form-input"
                                    required
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">
                                    사업자번호
                                </label>
                                <Input
                                    type="text"
                                    placeholder="사업자번호를 입력하세요"
                                    value={businessNumber}
                                    onChange={(e) => setBusinessNumber(e.target.value)}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">날짜 *</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <div className="date-input-wrapper">
                                            <Input
                                                type="text"
                                                value={format(date, "yyyy년 MM월 dd일")}
                                                readOnly
                                                className="date-input"
                                                placeholder="날짜를 선택하세요"
                                            />
                                            <CalendarIcon className="date-icon" />
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="calendar-popover" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={(newDate) => newDate && setDate(newDate)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </Card>

                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="submit-button"
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