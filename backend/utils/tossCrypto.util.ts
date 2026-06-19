const crypto = require("crypto");

// 토스 로그인 login-me 응답의 암호화된 PII(name 등)를 복호화한다.
// 알고리즘: AES-256-GCM
// 데이터 레이아웃: base64( IV(12B) | ciphertext | authTag(16B) )
// 키/AAD: 콘솔 토스 로그인 설정 후 이메일로 받은 값
//   - TOSS_DECRYPT_KEY : base64 인코딩된 32바이트(256bit) 키
//   - TOSS_DECRYPT_AAD : 문자열(UTF-8)
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

// 키/AAD를 인자로 받는 순수 함수 (단위 검증용)
const decryptWith = (encryptedText: string, base64Key: string, aad: string): string => {
  const data = Buffer.from(encryptedText, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(data.length - TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH, data.length - TAG_LENGTH);
  const key = Buffer.from(base64Key, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
};

// 환경변수에서 키/AAD를 읽어 복호화
const decryptTossPII = (encryptedText: string): string => {
  const key = process.env.TOSS_DECRYPT_KEY;
  const aad = process.env.TOSS_DECRYPT_AAD;
  if (!key || !aad) {
    throw new Error("TOSS_DECRYPT_KEY / TOSS_DECRYPT_AAD 환경변수가 설정되지 않았습니다.");
  }
  return decryptWith(encryptedText, key, aad);
};

module.exports = { decryptWith, decryptTossPII };
