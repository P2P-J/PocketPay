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
  expenseBreakdown: CategoryItem[];
  incomeBreakdown: CategoryItem[];
  transactions: Transaction[];
}

const fmt = (n: number) => `₩${Math.abs(n).toLocaleString()}`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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

function renderCategoryRows(items: CategoryItem[], accentColor: string): string {
  return items.slice(0, 8).map((item) => {
    const widthPct = Math.min(item.percent, 100);
    return `
      <tr>
        <td style="padding: 6px 0; font-size: 11pt; color: #1a1a1a; width: 40%;">
          ${escapeHtml(getCategoryEmoji(item.category))} ${escapeHtml(getCategoryLabel(item.category))}
        </td>
        <td style="padding: 6px 8px; width: 35%;">
          <div style="height: 6px; background: #eef0f2; border-radius: 3px; overflow: hidden;">
            <div style="height: 6px; width: ${widthPct}%; background: ${accentColor};"></div>
          </div>
        </td>
        <td style="padding: 6px 0; font-size: 11pt; font-weight: 600; text-align: right; color: ${accentColor}; white-space: nowrap;">
          ${fmt(item.total)}
        </td>
        <td style="padding: 6px 0 6px 8px; font-size: 9.5pt; color: #6b7684; text-align: right; width: 40px;">
          ${item.percent}%
        </td>
      </tr>
    `;
  }).join("");
}

export function generateReportHtml(data: ReportData): string {
  const { teamName, year, month, income, expense, expenseBreakdown, incomeBreakdown, transactions } = data;
  const balance = income - expense;
  const balanceColor = balance >= 0 ? "#0064ff" : "#d6293e";
  const generatedAt = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const groups = groupByDate(transactions);
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  const transactionRows = sortedDates.map((dateKey) => {
    const txs = groups[dateKey];
    const dayRows = txs.map((t) => {
      const sign = t.type === "income" ? "+" : "-";
      const color = t.type === "income" ? "#0064ff" : "#d6293e";
      return `
        <tr style="border-bottom: 1px solid #eef0f2;">
          <td style="padding: 8px 12px 8px 0; font-size: 10pt; color: #1a1a1a; vertical-align: top;">
            ${escapeHtml(getCategoryEmoji(t.category))} ${escapeHtml(t.merchant || getCategoryLabel(t.category))}
          </td>
          <td style="padding: 8px 12px 8px 0; font-size: 9.5pt; color: #6b7684; vertical-align: top;">
            ${escapeHtml(t.description || "-")}
          </td>
          <td style="padding: 8px 0; font-size: 10pt; font-weight: 600; text-align: right; color: ${color}; white-space: nowrap; vertical-align: top;">
            ${sign}${fmt(t.amount)}
          </td>
        </tr>
      `;
    }).join("");

    return `
      <tr>
        <td colspan="3" style="padding: 16px 0 6px;">
          <div style="font-size: 10pt; font-weight: 700; color: #6b7684; letter-spacing: 0.3px;">
            ${formatDateLabel(dateKey)}
          </div>
        </td>
      </tr>
      ${dayRows}
    `;
  }).join("");

  const safeTeamName = escapeHtml(teamName);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTeamName} ${year}년 ${month}월 정산 리포트</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "맑은 고딕", "AppleGothic", "Helvetica Neue", Arial, sans-serif;
      background: #ffffff;
      color: #1a1a1a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-size: 11pt;
      line-height: 1.5;
    }
    .page { padding: 32pt 36pt; }
    h1, h2, h3 { font-weight: 700; }
    table { border-collapse: collapse; width: 100%; }
    .section { margin-top: 28pt; }
    .section-label {
      font-size: 9.5pt;
      font-weight: 700;
      color: #6b7684;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding-bottom: 8pt;
      border-bottom: 1.5pt solid #1a1a1a;
      margin-bottom: 14pt;
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- 표지 -->
    <header style="border-bottom: 2pt solid #1a1a1a; padding-bottom: 18pt; margin-bottom: 28pt;">
      <div style="font-size: 9pt; color: #6b7684; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6pt;">
        Monthly Settlement Report
      </div>
      <div style="font-size: 22pt; font-weight: 700; color: #1a1a1a; margin-bottom: 4pt;">
        ${safeTeamName}
      </div>
      <div style="font-size: 13pt; color: #1a1a1a; margin-bottom: 14pt;">
        ${year}년 ${month}월 정산 리포트
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 9pt; color: #6b7684;">
        <span>발행일: ${generatedAt}</span>
        <span>발행: 작은 모임</span>
      </div>
    </header>

    <!-- 요약 -->
    <section>
      <div class="section-label">Summary</div>
      <table style="margin-bottom: 12pt;">
        <tr>
          <td style="padding: 12pt 14pt; background: #f7f9fc; border-radius: 6pt; width: 50%; vertical-align: top;">
            <div style="font-size: 9.5pt; color: #6b7684; margin-bottom: 4pt;">수입 합계</div>
            <div style="font-size: 16pt; font-weight: 700; color: #0064ff;">+${fmt(income)}</div>
          </td>
          <td style="width: 8pt;"></td>
          <td style="padding: 12pt 14pt; background: #f7f9fc; border-radius: 6pt; width: 50%; vertical-align: top;">
            <div style="font-size: 9.5pt; color: #6b7684; margin-bottom: 4pt;">지출 합계</div>
            <div style="font-size: 16pt; font-weight: 700; color: #d6293e;">-${fmt(expense)}</div>
          </td>
        </tr>
      </table>
      <div style="background: #1a1a1a; color: #ffffff; padding: 14pt 16pt; border-radius: 6pt; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 11pt; font-weight: 600;">순잔액 (수입 − 지출)</span>
        <span style="font-size: 18pt; font-weight: 700; color: ${balance >= 0 ? "#7cd4ff" : "#ff8a96"};">
          ${balance >= 0 ? "+" : "−"}${fmt(balance)}
        </span>
      </div>
    </section>

    ${expenseBreakdown.length > 0 ? `
    <section class="section">
      <div class="section-label">지출 카테고리</div>
      <table>
        ${renderCategoryRows(expenseBreakdown, "#d6293e")}
      </table>
    </section>
    ` : ""}

    ${incomeBreakdown.length > 0 ? `
    <section class="section">
      <div class="section-label">수입 카테고리</div>
      <table>
        ${renderCategoryRows(incomeBreakdown, "#0064ff")}
      </table>
    </section>
    ` : ""}

    ${transactions.length > 0 ? `
    <section class="section">
      <div class="section-label">전체 거래 내역 · ${transactions.length}건</div>
      <table>
        <thead>
          <tr style="border-bottom: 1pt solid #1a1a1a;">
            <th style="padding: 6pt 12pt 6pt 0; text-align: left; font-size: 9pt; color: #6b7684; font-weight: 700; letter-spacing: 0.5px;">항목</th>
            <th style="padding: 6pt 12pt 6pt 0; text-align: left; font-size: 9pt; color: #6b7684; font-weight: 700; letter-spacing: 0.5px;">메모</th>
            <th style="padding: 6pt 0; text-align: right; font-size: 9pt; color: #6b7684; font-weight: 700; letter-spacing: 0.5px;">금액</th>
          </tr>
        </thead>
        <tbody>
          ${transactionRows}
        </tbody>
      </table>
    </section>
    ` : ""}

    <footer style="margin-top: 36pt; padding-top: 14pt; border-top: 1pt solid #eef0f2; text-align: center; font-size: 8.5pt; color: #b0b8c1;">
      본 리포트는 작은 모임 앱에서 자동 생성되었습니다 · ${generatedAt}
    </footer>

  </div>
</body>
</html>`;
}
