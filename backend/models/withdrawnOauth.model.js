const mongoose = require("mongoose");

const WithdrawnOauthSchema = new mongoose.Schema({
    provider: { type: String, enum: ["google"], required: true },
    providerId: { type: String, required: true },
    withdrawnAt: { type: Date, default: Date.now },
}, {
    timestamps: true
});

WithdrawnOauthSchema.index({ provider: 1, providerId: 1 }, { unique: true });

module.exports = mongoose.model("WithdrawnOauth", WithdrawnOauthSchema);
