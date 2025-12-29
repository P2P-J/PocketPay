const mongoose = require("mongoose");

const DealSchema = new mongoose.Schema({
    storeInfo: { type: String, index: true },
    division: { type: String },
    description: String,
    category: { type: String },
    amount: { type: Number },
    businessNumber: { type: String },
    date : { type: Date },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Deal", DealSchema);