const mongoose = require("mongoose");

const postLikeSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "post",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  { timestamps: true },
);

postLikeSchema.index({ post: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("postLike", postLikeSchema, "postLike");
