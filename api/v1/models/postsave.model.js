const mongoose = require("mongoose");

const postSaveSchema = new mongoose.Schema(
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
    collection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "collection",
      default: null, // nếu không chọn thì vẫn save bình thường
    },
  },
  { timestamps: true },
);
postSaveSchema.index({ post: 1, user: 1, collection: 1 }, { unique: true });
module.exports = mongoose.model("postsave", postSaveSchema, "postsave");
