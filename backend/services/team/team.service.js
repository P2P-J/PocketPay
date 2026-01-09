const { Team, User, Deal } = require("../../models/index");

// 팀 등록 POST /team
exports.createTeam = async (userId, { name, description }) => {
    const team = await Team.create({
        name,
        description,
        owner: userId,
        members: [{
            user: userId, role: "owner",
        }],
    });

    return team;
};

// 로그인 유저 팀 목록 조회 GET /team
exports.getMyTeams = async (userId) => {
    const teams = await Team.find({ "members.user": userId });

    return teams;
};

// 팀 개별 조회 GET /team/:id
exports.getTeam = async (teamId, userId) => {
    const team = await Team.findOne({
        _id: teamId,
        "members.user": userId,
    });

    if (!team) {
        throw new Error("팀을 찾을 수 없습니다.");
    }

    return team;
};

// 팀 수정 PUT /team/:id
exports.updateTeam = async (teamId, userId, data) => {
    const team = await Team.findOne({
        _id: teamId,
        owner: userId,
    });

    if (!team) {
        throw new Error("팀 혹은 권한이 없습니다.");
    }

    Object.assign(team, data);

    await team.save();
    return team;
};

// 팀 삭제 DELETE /team/:id
exports.deleteTeam = async (teamId, userId) => {
    const team = await Team.findOneAndDelete({
        _id: teamId,
        owner: userId,
    });

    if (!team) {
        throw new Error("팀 혹은 권한이 없습니다.");
    }

    // 팀 삭제 시 관련 Deal도 함께 삭제
    await Deal.deleteMany({ teamId: teamId });
};

// 팀원 초대 POST /team/:id/invite
exports.inviteMember = async (teamId, ownerId, email) => {
    const team = await Team.findOne({
        _id: teamId,
        owner: ownerId,
    });

    if (!team) {
        throw new Error("팀 혹은 권한이 없습니다.");
    }

    const user = await User.findOne({ email, provider: "local" });

    if (!user) {
        throw new Error("초대할 사용자를 찾을 수 없습니다.");
    }

    const alreadyMember = team.members.some(
        (member) => member.user.toString() === user._id.toString()
    );

    if (alreadyMember) {
        throw new Error("이미 팀원으로 등록된 사용자입니다.");
    }

    team.members.push({
        user: user._id,
        role: "member",
    });

    await team.save();
    return team;
}