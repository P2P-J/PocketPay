const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const options = {
      dbName: "pocketpay",
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    // MongoDB Atlas는 기본 TLS 사용, 로컬 개발 시에도 TLS 강제
    if (process.env.NODE_ENV === "production") {
      options.tls = true;
      options.tlsAllowInvalidCertificates = false;
    }

    await mongoose.connect(process.env.MONGO_URI, options);

    console.log("MongoDB connected (TLS:", options.tls ? "enabled" : "URI default", ")");

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected. Attempting reconnection...");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected");
    });
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

module.exports = { connectDB };
