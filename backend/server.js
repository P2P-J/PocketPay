require("dotenv").config();
const express = require("express");
const { connectDB } = require("./config/db.js");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();
connectDB();

app.use(cors({
  credentials: true,
  // origin: ['http://localhost:3000', 'http://localhost:5173']
}));

app.use(cookieParser());
app.use(express.json());
app.use("/auth", require("./routes/auth.route"));
app.use("/deal", require("./routes/deal.route"));
app.use("/team", require("./routes/team.route"));
app.use("/ocr", require("./routes/ocr.route"));
app.use("/account", require("./routes/account.route"));

app.listen(process.env.PORT, () => {
  console.log("Server running on 3000");
});
