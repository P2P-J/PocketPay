const mongoose = require("mongoose");

const isValidObjectId = (id: string): boolean => mongoose.Types.ObjectId.isValid(id);

module.exports = { isValidObjectId };
