const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const teamService = require("../services/team/team.service");

// 회귀 방지: getMyTeams는 Team.aggregate를 쓰는데, aggregate는 find/findOne과 달리
// 스키마 기반 자동 캐스팅을 하지 않는다. JWT에서 오는 userId는 항상 "문자열"이므로,
// $match에서 ObjectId로 명시 변환하지 않으면 ObjectId로 저장된 members.user와 매칭에
// 실패해 빈 배열을 반환한다(= "모임이 사라지는" 프로덕션 버그). 이 테스트는 그 조건을 재현한다.

let mongod: any;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

after(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

test("getMyTeams는 문자열 userId로도 내가 만든 모임을 반환한다", async () => {
  // JWT 페이로드의 userId와 동일하게 "문자열" 형태로 전달
  const userId = new mongoose.Types.ObjectId().toString();

  await teamService.createTeam(userId, {
    name: "테스트 모임",
    category: "friend",
    displayMode: "nickname",
    accountMode: "personal",
    feeEnabled: false,
  });

  const teams = await teamService.getMyTeams(userId);

  assert.equal(teams.length, 1, "문자열 userId로도 내 모임이 조회돼야 한다");
  assert.equal(teams[0].name, "테스트 모임");
});
