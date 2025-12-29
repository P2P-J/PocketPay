const mongoose = require("mongoose");

const TeamSchema = new mongoose.Schema({
    name: { type: String, index: true },
    description : String,
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Team", TeamSchema);