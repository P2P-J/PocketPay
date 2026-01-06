const jwt = require("jsonwebtoken");

const issueToken = (user) => {
    return jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

const verifyToken = (authorization) => {
    if (!authorization) return null;

    const token = authorization.split(" ")[1];
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        return decoded;
    } catch (err) {
        return null;
    }
};

module.exports = {
    issueToken,
    verifyToken,
};