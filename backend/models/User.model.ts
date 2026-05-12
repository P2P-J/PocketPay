import mongoose, { Document } from "mongoose";

interface IOauthTokens {
  naver?: { refreshToken?: string };
  google?: { refreshToken?: string };
  kakao?: { refreshToken?: string };
  apple?: { refreshToken?: string };
}

interface IUserAccount {
  bank: string;
  number: string;
  holder: string;
}

interface IUser extends Document {
  email: string;
  password?: string;
  name: string;
  nickname: string;
  handle?: string;
  handleChangedAt?: Date;
  account?: IUserAccount;
  pushTokens?: string[];
  notificationsLastViewedAt?: Date;
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
    nickname: { type: String, required: true, trim: true, minlength: 1, maxlength: 20 },
    handle: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true,
        trim: true,
        match: /^[a-z0-9_]{3,20}$/,
    },
    handleChangedAt: { type: Date },
    account: {
        bank: { type: String, trim: true },
        number: { type: String, trim: true },
        holder: { type: String, trim: true },
    },
    pushTokens: { type: [String], default: [] },
    notificationsLastViewedAt: { type: Date },
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
