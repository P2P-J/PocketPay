require("dotenv").config();
const express = require("express");
const { connectDB } = require("./config/db.js");

const app = express();
connectDB();

app.use(express.json());
app.use("/auth", require("./routes/auth.route"));
app.use("/deal", require("./routes/deal.route"));

app.listen(process.env.PORT, () => {
  console.log("Server running on 3000");
});
