require("dotenv").config();
const express = require("express");
const { connectDB } = require("./config/db.js");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();
connectDB();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173']
}));

app.use(express.json());
// 라우터 중앙화했으니, 앞으로 API 추가되면 참고해서 구현해야 돼요!
app.use(require("./routes"));

app.listen(process.env.PORT, () => {
  console.log("Server running on 3000");
});
