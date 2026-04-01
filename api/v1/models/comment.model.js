const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    parent_id: {
      type: String,
      default: "",
    },
    likes: [
      {
        user_id: String,
        avatar: String,
        name: String,
      },
    ],
    post_id: String,
    user_id: String,
    name: String,
    avatar: String,
    content: String,
  },
  {
    timestamps: true,
  }
);

const Comment = mongoose.model("comment", commentSchema, "comments");
module.exports = Comment;
