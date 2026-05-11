const express = require("express");
const router = express.Router();
const dutchController = require("../controllers/dutch.controller");
const { loginUserVerify } = require("../middleware/loginUserVerify.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  createDutchRequestsSchema,
  dutchIdParamSchema,
} = require("../validators/dutch.validator");

router.use(loginUserVerify);

router.post(
  "/",
  validate(createDutchRequestsSchema),
  dutchController.createDutchRequestsController
);
router.get("/", dutchController.listMyDutchRequestsController);
router.post(
  "/:id/dismiss",
  validate(dutchIdParamSchema),
  dutchController.dismissDutchRequestController
);

module.exports = router;
