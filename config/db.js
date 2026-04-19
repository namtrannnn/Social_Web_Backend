const mongoose = require("mongoose");

module.exports.connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connect success!");
  } catch (error) {
    console.error("❌ MongoDB connect error:", error.message);
  }
};
