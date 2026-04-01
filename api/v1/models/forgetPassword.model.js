const mongoose = require("mongoose");
const generate = require("../../../helpers/generate.helper");

const forgetPasswordSchema = new mongoose.Schema(
  {
    email: String,
    otp: {
      type: String,
      default: generate.generateNumber(6),
    },
    expireAt: {
      type: Date,
      expires: 180,
      default: () => new Date(Date.now() + 3 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  }
);

const forgetPassword = mongoose.model(
  "forgetPassword",
  forgetPasswordSchema,
  "forget-password"
);

module.exports = forgetPassword;
