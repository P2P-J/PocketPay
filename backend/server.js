require("dotenv").config();
const express = require("express");
const { connectDB } = require("./config/db.js");
const cors = require("cors");
const AppError = require("./utils/AppError");
const { handleError } = require("./utils/errorHandler");

const app = express();
connectDB();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173']
}));

app.use(express.json());
app.use(require("./routes"));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return handleError(res, AppError.badRequest("요청 Body(JSON) 형식이 올바르지 않습니다."));
  }
  return handleError(res, err);
});

app.listen(process.env.PORT, () => {
  console.log("Server running on 3000");
});