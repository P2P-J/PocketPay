const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            index: true,
        },
        password: {
            type: String,
        },
        name: {
            type: String,
            required: true,
        },
        provider: {
            type: String,
            enum: ["local", "google", "kakao", "naver"],
            required: true,
        },
        providerId: {
            type: String,
        },
    },
    { timestamps: true }
);

UserSchema.index({ email: 1, provider: 1 }, { unique: true });

module.exports = mongoose.model("User", UserSchema);