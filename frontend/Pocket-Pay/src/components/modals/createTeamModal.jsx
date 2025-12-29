import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Card } from "../ui/card";
import { useAuthStore } from "../../store/authStore";
import { useTeamStore } from "../../store/teamStore";
import { X } from "lucide-react";
import "./createTeamModal.css";

export function CreateTeamModal({ onClose }) {
    const [teamName, setTeamName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const { accessToken } = useAuthStore();
    const { createTeam } = useTeamStore();

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 모임 이름 유효성 검사
        if (!teamName.trim()) {
            setError("모임 이름을 입력해주세요");
            return;
        }

        setError("");
        setLoading(true);

        try {
            await createTeam(accessToken || "", {
                name: teamName.trim(),
                description: description.trim() || undefined,
            });

            // 성공 시 모달 닫기
            onClose();
        } catch (err) {
            console.error("Team creation error:", err);
            setError(err.message || "모임 생성에 실패했습니다");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="team-modal-container">
            {/* Header */}
            <div className="team-modal-header">
                <h2 className="team-modal-title">새 모임 만들기</h2>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="team-modal-close-btn"
                >
                    <X className="w-5 h-5" />
                </Button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="team-modal-form">
                {/* 모임 이름 */}
                <div className="form-field">
                    <label className="form-label">
                        모임 이름 *
                    </label>
                    <Input
                        type="text"
                        placeholder="예: 동아리, 학생회, 교회"
                        value={teamName}
                        onChange={(e) => {
                            setTeamName(e.target.value);
                            if (error) setError(""); // 입력 시 에러 메시지 제거
                        }}
                        className="form-input-primary"
                        autoFocus
                    />
                    {/* 에러 메시지 툴팁 */}
                    {error && (
                        <div className="error-tooltip-container">
                            <div className="error-tooltip">
                                <div className="error-tooltip-content">
                                    <span className="error-tooltip-icon">
                                        !
                                    </span>
                                    <span>{error}</span>
                                </div>
                                {/* 화살표 */}
                                <div className="error-tooltip-arrow"></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 모임 소개 */}
                <div className="form-field">
                    <label className="form-label">
                        모임 소개
                    </label>
                    <Textarea
                        placeholder="모임에 대해 간단히 설명해주세요"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="form-textarea-primary"
                        rows={4}
                    />
                </div>

                {/* 버튼 그룹 */}
                <div className="button-group">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="button-cancel"
                        disabled={loading}
                    >
                        취소
                    </Button>
                    <Button
                        type="submit"
                        className="button-submit"
                        disabled={loading}
                    >
                        {loading ? "생성 중..." : "모임 만들기"}
                    </Button>
                </div>
            </form>
        </Card>
    );
}

