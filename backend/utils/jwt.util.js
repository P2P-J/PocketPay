const jwt = require("jsonwebtoken");

const issueToken = (user) => {
    return jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

module.exports = {
    issueToken,
};