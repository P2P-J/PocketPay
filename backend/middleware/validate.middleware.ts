import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
const { ZodError } = require("zod");

interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

/**
 * Zod 스키마 기반 요청 검증 미들웨어
 * Express 5에서 req.query는 getter 전용이므로 덮어쓰지 않고 검증만 수행
 */
const validate = (schemas: ValidationSchemas) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.params) {
        schemas.params.parse(req.params);
      }
      if (schemas.query) {
        schemas.query.parse(req.query);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const messages = (err as any).errors.map((e: any) => `${e.path.join(".")}: ${e.message}`);
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
