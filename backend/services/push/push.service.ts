const { User } = require("../../models/index");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// 단일 사용자에게 푸시 발송 (모든 등록 기기)
// 실패해도 throw 안 함 — 호출자가 fire-and-forget으로 사용
const sendPushToUser = async (userId, payload) => {
  const user = await User.findById(userId).select("pushTokens");
  if (!user || !user.pushTokens || user.pushTokens.length === 0) {
    return;
  }

  const messages = user.pushTokens.map((token) => ({
    to: token,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    sound: "default",
  }));

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      console.warn("Expo push HTTP error", res.status);
      return;
    }

    const json = await res.json();
    const tickets = json.data || [];

    // invalid 토큰 자동 제거 (DeviceNotRegistered)
    const invalidTokens = [];
    tickets.forEach((ticket, i) => {
      if (
        ticket.status === "error" &&
        ticket.details &&
        ticket.details.error === "DeviceNotRegistered"
      ) {
        invalidTokens.push(user.pushTokens[i]);
      }
    });

    if (invalidTokens.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: { pushTokens: { $in: invalidTokens } },
      });
    }
  } catch (err) {
    console.warn("Expo push failed", err);
  }
};

module.exports = { sendPushToUser };
