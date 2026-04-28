import mongoose, { Document } from "mongoose";

interface IOauthTokens {
  naver?: { refreshToken?: string };
  google?: { refreshToken?: string };
  kakao?: { refreshToken?: string };
  apple?: { refreshToken?: string };
}

interface IUser extends Document {
  email: string;
  password?: string;
  name: string;
  provider: "local" | "google" | "naver" | "kakao" | "apple";
  providerId?: string;
  oauthTokens?: IOauthTokens;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new mongoose.Schema<IUser>({
    email: { type: String, required: true, index: true },
    password: { type: String },
    name: { type: String, required: true },
    provider: { type: String, enum: ["local", "google", "naver", "kakao", "apple"], required: true },
    providerId: { type: String },
    oauthTokens: {
        naver: { refreshToken: { type: String, select: false } },
        google: { refreshToken: { type: String, select: false } },
        kakao: { refreshToken: { type: String, select: false } },
        apple: { refreshToken: { type: String, select: false } },
    }
}, {
    timestamps: true
});

UserSchema.index({ email: 1, provider: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model<IUser>("User", UserSchema);
