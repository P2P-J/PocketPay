const { test } = require("node:test");
const assert = require("node:assert/strict");
const { z } = require("zod");
const { validate } = require("../middleware/validate.middleware");

const createRes = () => {
  const res: any = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res;
  };
  return res;
};

const schemas = {
  body: z.object({
    email: z.string().email("올바른 이메일 형식이 아닙니다."),
  }),
};

test("검증 실패 시 500이 아닌 400과 필드별 에러 메시지를 반환한다", () => {
  const req: any = { body: { email: "not-an-email" } };
  const res = createRes();
  let nextCalled = false;

  validate(schemas)(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    message: "입력값이 올바르지 않습니다.",
    errors: ["email: 올바른 이메일 형식이 아닙니다."],
  });
});

test("검증 통과 시 next를 호출한다", () => {
  const req: any = { body: { email: "user@example.com" } };
  const res = createRes();
  let nextArg: unknown = "not-called";

  validate(schemas)(req, res, (err?: unknown) => {
    nextArg = err;
  });

  assert.equal(nextArg, undefined);
  assert.equal(res.statusCode, undefined);
});
