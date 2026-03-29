import { getCategoryLabel, getCategoryEmoji } from "@/constants/categories";
import type { Transaction } from "@/types/transaction";

interface CategoryItem {
  category: string;
  total: number;
  percent: number;
}

interface ReportData {
  teamName: string;
  year: number;
  month: number;
  income: number;
  expense: number;
  categoryBreakdown: CategoryItem[];
  transactions: Transaction[];
}

const fmt = (n: number) => `₩${Math.abs(n).toLocaleString()}`;

function groupByDate(transactions: Transaction[]): Record<string, Transaction[]> {
  const groups: Record<string, Transaction[]> = {};
  for (const t of transactions) {
    const key = t.date?.split("T")[0] || "날짜 없음";
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }
  return groups;
}

function formatDateLabel(dateStr: string): string {
  if (dateStr === "날짜 없음") return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

export function generateReportHtml(data: ReportData): string {
  const { teamName, year, month, income, expense, categoryBreakdown, transactions } = data;
  const balance = income - expense;
  const balanceColor = balance >= 0 ? "#3DD598" : "#F04452";
  const generatedAt = new Date().toLocaleDateString("ko-KR");

  const top5 = categoryBreakdown.slice(0, 5);
  const groups = groupByDate(transactions);
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  // 카테고리 섹션
  const categoryRows = top5.map((item) => {
    const barColor = item.percent >= 40 ? "#F04452" : item.percent >= 20 ? "#FF8C42" : "#3DD598";
    return `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 13px; color: #191F28; font-weight: 600;">
            ${getCategoryEmoji(item.category)} ${getCategoryLabel(item.category)}
          </span>
          <div style="text-align: right;">
            <span style="font-size: 13px; font-weight: 700; color: #F04452;">${fmt(item.total)}</span>
            <span style="font-size: 11px; color: #8B95A1; margin-left: 6px;">${item.percent}%</span>
          </div>
        </div>
        <div style="height: 5px; background: #F2F4F6; border-radius: 3px; overflow: hidden;">
          <div style="height: 5px; width: ${Math.min(item.percent, 100)}%; background: ${barColor}; border-radius: 3px;"></div>
        </div>
      </div>
    `;
  }).join("");

  // 거래 내역 섹션
  const transactionSection = sortedDates.map((dateKey) => {
    const txs = groups[dateKey];
    const dayTotal = txs.reduce((sum, t) => {
      return sum + (t.type === "income" ? t.amount : -t.amount);
    }, 0);

    const rows = txs.map((t) => `
      <tr style="border-bottom: 1px solid #F2F4F6;">
        <td style="padding: 8px 4px; font-size: 12px; color: #191F28;">
          ${getCategoryEmoji(t.category)} ${t.merchant || getCategoryLabel(t.category)}
        </td>
        <td style="padding: 8px 4px; font-size: 11px; color: #8B95A1;">${t.description || "-"}</td>
        <td style="padding: 8px 4px; font-size: 12px; font-weight: 700; text-align: right; color: ${t.type === "income" ? "#3182F6" : "#F04452"};">
          ${t.type === "income" ? "+" : "-"}${fmt(t.amount)}
        </td>
      </tr>
    `).join("");

    return `
      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 2px solid #E5E8EB; margin-bottom: 4px;">
          <span style="font-size: 12px; font-weight: 700; color: #8B95A1;">${formatDateLabel(dateKey)}</span>
          <span style="font-size: 12px; font-weight: 700; color: ${dayTotal >= 0 ? "#3182F6" : "#F04452"};">
            ${dayTotal >= 0 ? "+" : ""}${dayTotal >= 0 ? fmt(dayTotal) : `-${fmt(dayTotal)}`}
          </span>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          ${rows}
        </table>
      </div>
    `;
  }).join("");

  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Noto Sans KR', -apple-system, sans-serif; background: #F8F9FA; color: #191F28; }
        .page { max-width: 600px; margin: 0 auto; background: #FFFFFF; }
      </style>
    </head>
    <body>
      <div class="page">

        <!-- 헤더 -->
        <div style="background: linear-gradient(135deg, #3DD598 0%, #26C07F 100%); padding: 32px 28px; color: white;">
          <div style="font-size: 11px; opacity: 0.8; margin-bottom: 6px; letter-spacing: 1px; text-transform: uppercase;">
            Monthly Report
          </div>
          <div style="font-size: 26px; font-weight: 700; margin-bottom: 4px;">${teamName}</div>
          <div style="font-size: 14px; opacity: 0.9;">${year}년 ${month}월 정산 리포트</div>
          <div style="margin-top: 16px; font-size: 11px; opacity: 0.7;">생성일: ${generatedAt} · 작은 모임</div>
        </div>

        <!-- 요약 카드 -->
        <div style="padding: 24px 28px; background: #FFFFFF;">
          <div style="display: flex; gap: 12px; margin-bottom: 16px;">
            <div style="flex: 1; background: #F0F9FF; border-radius: 12px; padding: 16px;">
              <div style="font-size: 11px; color: #8B95A1; margin-bottom: 4px;">이번 달 수입</div>
              <div style="font-size: 20px; font-weight: 700; color: #3182F6;">+${fmt(income)}</div>
            </div>
            <div style="flex: 1; background: #FFF0F0; border-radius: 12px; padding: 16px;">
              <div style="font-size: 11px; color: #8B95A1; margin-bottom: 4px;">이번 달 지출</div>
              <div style="font-size: 20px; font-weight: 700; color: #F04452;">-${fmt(expense)}</div>
            </div>
          </div>
          <div style="background: #F8F9FA; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px; font-weight: 600; color: #191F28;">이번 달 순수익</span>
            <span style="font-size: 22px; font-weight: 700; color: ${balanceColor};">
              ${balance >= 0 ? "+" : "-"}${fmt(balance)}
            </span>
          </div>
        </div>

        ${top5.length > 0 ? `
        <!-- 카테고리별 지출 -->
        <div style="padding: 0 28px 24px; background: #FFFFFF;">
          <div style="height: 1px; background: #F2F4F6; margin-bottom: 20px;"></div>
          <div style="font-size: 13px; font-weight: 700; color: #8B95A1; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">
            지출 카테고리 TOP ${top5.length}
          </div>
          ${categoryRows}
        </div>
        ` : ""}

        ${transactions.length > 0 ? `
        <!-- 거래 내역 -->
        <div style="padding: 0 28px 32px; background: #FFFFFF;">
          <div style="height: 1px; background: #F2F4F6; margin-bottom: 20px;"></div>
          <div style="font-size: 13px; font-weight: 700; color: #8B95A1; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">
            전체 거래 내역 (${transactions.length}건)
          </div>
          ${transactionSection}
        </div>
        ` : ""}

        <!-- 푸터 -->
        <div style="background: #F8F9FA; padding: 16px 28px; text-align: center; border-top: 1px solid #E5E8EB;">
          <div style="font-size: 11px; color: #B0B8C1;">
            작은 모임 · 모임 회계, 이제 간편하게
          </div>
        </div>

      </div>
    </body>
    </html>
  `;
}
