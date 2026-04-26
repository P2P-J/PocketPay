const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

// Buffer를 Cloudinary에 업로드하고 URL 반환
const uploadBuffer = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "pocketpay/receipts",
        resource_type: "image",
        ...options,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

// Cloudinary URL에서 public_id 추출
// 예: https://res.cloudinary.com/xxx/image/upload/v1234/pocketpay/receipts/abc.jpg → pocketpay/receipts/abc
const extractPublicId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/i);
  return match ? match[1] : null;
};

// Cloudinary 자원 삭제 (실패해도 throw 안 함)
const destroyAsset = async (url: string): Promise<void> => {
  if (!isCloudinaryConfigured()) return;
  const publicId = extractPublicId(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (err: any) {
    console.error("[Cloudinary destroy failed]", publicId, err?.message);
  }
};

module.exports = {
  cloudinary,
  uploadBuffer,
  isCloudinaryConfigured,
  extractPublicId,
  destroyAsset,
};
