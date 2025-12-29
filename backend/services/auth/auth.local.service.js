const { hashPassword, comparePassword } = require("../../utils/bcrypt.util");
const { User } = require("../../models/index");
const { issueToken } = require("../../utils/jwt.util");

const signupLocal = async ({ email, password, name }) => {
    const exists = await User.findOne({
        email,
        provider: "local",
    });

    if (exists) {
        throw new Error("이미 가입된 이메일입니다.");
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
        email,
        password: hashedPassword,
        name,
        provider: "local",
    });

    return user;
};

// 로그인 POST /auth/login
const loginLocal = async ({ email, password }) => {
    const user = await User.findOne({
        email,
        provider: "local",
    });
    console.log("USER FOUND:", !!user);
    if (!user) {
        throw new Error("존재하지 않는 사용자");
    }
    console.log("BEFORE COMPARE");
    const match = await comparePassword(password, user.password);
    if (!match) {
        throw new Error("비밀번호 불일치");
    }
    console.log("BEFORE COMPARE");
    const token = issueToken(user);
    console.log("TOKEN ISSUED");
    return { user, token };
};

module.exports = {
    signupLocal,
    loginLocal,
};