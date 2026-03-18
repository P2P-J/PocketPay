const { ZodError } = require("zod");

/**
 * Zod 스키마 기반 요청 검증 미들웨어
 * @param {Object} schemas - { body?, params?, query? } 각각 Zod 스키마
 */
const validate = (schemas) => {
  return (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const messages = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
        return res.status(400).json({
          message: "입력값이 올바르지 않습니다.",
          errors: messages,
        });
      }
      next(err);
    }
  };
};

module.exports = { validate };
