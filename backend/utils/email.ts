const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

// 인증코드 이메일 HTML 템플릿
const getVerificationTemplate = (code: string, purpose: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#F5F6F8; font-family:-apple-system,BlinkMacSystemFont,'Pretendard','Apple SD Gothic Neo',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F6F8; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:420px; background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <!-- 헤더 -->
          <tr>
            <td style="background-color:#3DD598; padding:32px 24px; text-align:center;">
              <div style="width:48px; height:48px; background-color:rgba(255,255,255,0.2); border-radius:12px; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px;">
                <span style="font-size:24px; color:#FFFFFF; font-weight:bold;">₩</span>
              </div>
              <h1 style="color:#FFFFFF; font-size:22px; font-weight:700; margin:0;">작은 모임</h1>
              <p style="color:rgba(255,255,255,0.85); font-size:13px; margin:4px 0 0;">모임 회계, 이제 간편하게.</p>
            </td>
          </tr>

          <!-- 본문 -->
          <tr>
            <td style="padding:32px 24px;">
              <h2 style="color:#191F28; font-size:18px; font-weight:700; margin:0 0 8px;">${purpose}</h2>
              <p style="color:#8B95A1; font-size:14px; line-height:1.6; margin:0 0 24px;">
                아래 인증코드를 입력해주세요.<br>
                인증코드는 <strong style="color:#191F28;">10분간</strong> 유효합니다.
              </p>

              <!-- 인증코드 -->
              <div style="background-color:#F5F6F8; border-radius:12px; padding:20px; text-align:center; margin-bottom:24px;">
                <span style="font-size:32px; font-weight:700; color:#3DD598; letter-spacing:8px;">${code}</span>
              </div>

              <p style="color:#B0B8C1; font-size:12px; line-height:1.5; margin:0;">
                본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.<br>
                인증코드를 다른 사람에게 알려주지 마세요.
              </p>
            </td>
          </tr>

          <!-- 푸터 -->
          <tr>
            <td style="background-color:#F5F6F8; padding:16px 24px; text-align:center;">
              <p style="color:#B0B8C1; font-size:11px; margin:0;">
                © 2026 작은 모임. 엑셀 없이도 간편한 모임 회계 관리.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// 인증코드 발송
const sendVerificationCode = async (to: string, code: string, purpose = "이메일 인증") => {
  const subjects = {
    "이메일 인증": "[작은 모임] 이메일 인증코드",
    "비밀번호 재설정": "[작은 모임] 비밀번호 재설정 인증코드",
  };

  await transporter.sendMail({
    from: `"작은 모임" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: subjects[purpose] || "[작은 모임] 인증코드",
    html: getVerificationTemplate(code, purpose),
  });
};

module.exports = { sendVerificationCode };
