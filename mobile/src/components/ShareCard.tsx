import { forwardRef } from "react";
import { View, Text } from "react-native";
import { getCategoryEmoji, getCategoryLabel } from "@/constants/categories";

interface CategoryItem {
  category: string;
  total: number;
  percent: number;
}

interface ShareCardProps {
  teamName: string;
  year: number;
  month: number;
  income: number;
  expense: number;
  categoryBreakdown: CategoryItem[];
}

export const ShareCard = forwardRef<View, ShareCardProps>(
  ({ teamName, year, month, income, expense, categoryBreakdown }, ref) => {
    const balance = income - expense;
    const top3 = categoryBreakdown.slice(0, 3);

    const fmt = (n: number) =>
      n < 0
        ? `-₩${Math.abs(n).toLocaleString()}`
        : `₩${n.toLocaleString()}`;

    const balanceColor =
      balance > 0 ? "#3DD598" : balance < 0 ? "#F04452" : "#191F28";

    return (
      <View
        ref={ref}
        style={{
          width: 320,
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 8,
        }}
        collapsable={false}
      >
        {/* 헤더 */}
        <View
          style={{
            backgroundColor: "#3DD598",
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 20,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.8)",
              fontFamily: "Pretendard",
              marginBottom: 4,
            }}
          >
            {year}년 {month}월 정산 리포트
          </Text>
          <Text
            style={{
              fontSize: 22,
              fontFamily: "Pretendard-Bold",
              color: "#FFFFFF",
              letterSpacing: -0.5,
            }}
          >
            {teamName}
          </Text>
        </View>

        {/* 바디 */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 20 }}>
          {/* 수입/지출 행 */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#8B95A1",
                  fontFamily: "Pretendard",
                  marginBottom: 2,
                }}
              >
                이번 달 수입
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: "Pretendard-Bold",
                  color: "#3182F6",
                }}
              >
                +{fmt(income)}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#8B95A1",
                  fontFamily: "Pretendard",
                  marginBottom: 2,
                }}
              >
                이번 달 지출
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: "Pretendard-Bold",
                  color: "#F04452",
                }}
              >
                -{fmt(expense)}
              </Text>
            </View>
          </View>

          {/* 구분선 */}
          <View
            style={{
              height: 1,
              backgroundColor: "#E5E8EB",
              marginVertical: 12,
            }}
          />

          {/* 순수익 */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Pretendard-SemiBold",
                color: "#191F28",
              }}
            >
              이번 달 순수익
            </Text>
            <Text
              style={{
                fontSize: 20,
                fontFamily: "Pretendard-Bold",
                color: balanceColor,
              }}
            >
              {balance >= 0 ? "+" : ""}
              {fmt(balance)}
            </Text>
          </View>

          {/* 카테고리 TOP 3 */}
          {top3.length > 0 && (
            <View>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Pretendard-SemiBold",
                  color: "#8B95A1",
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                지출 TOP {top3.length}
              </Text>
              {top3.map((item, i) => (
                <View key={item.category} style={{ marginBottom: i < top3.length - 1 ? 10 : 0 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ fontSize: 14, marginRight: 6 }}>
                        {getCategoryEmoji(item.category)}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: "Pretendard-SemiBold",
                          color: "#191F28",
                        }}
                      >
                        {getCategoryLabel(item.category)}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: "Pretendard-Bold",
                          color: "#F04452",
                        }}
                      >
                        ₩{item.total.toLocaleString()}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontFamily: "Pretendard",
                          color: "#8B95A1",
                        }}
                      >
                        {item.percent}%
                      </Text>
                    </View>
                  </View>
                  {/* 퍼센트 바 */}
                  <View
                    style={{
                      height: 4,
                      backgroundColor: "#F2F4F6",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: 4,
                        width: `${Math.min(item.percent, 100)}%`,
                        backgroundColor:
                          i === 0 ? "#F04452" : i === 1 ? "#FF8C42" : "#FFB74D",
                        borderRadius: 2,
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 푸터 */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: "#F2F4F6",
          }}
        >
          <View
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              backgroundColor: "#3DD598",
              marginRight: 6,
            }}
          />
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Pretendard-SemiBold",
              color: "#8B95A1",
            }}
          >
            작은 모임 · 모임 회계, 이제 간편하게
          </Text>
        </View>
      </View>
    );
  }
);

ShareCard.displayName = "ShareCard";
