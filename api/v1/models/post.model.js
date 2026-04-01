const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    privacy: String,
    content: String,
    images: [
      {
        url: String,
        public_id: String,
      },
    ],
    postedBy: {
      avatar: String,
      user_id: String,
      name: String,
      email: String,
    },
    likes: [
      {
        user_id: String,
        avatar: String,
        name: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Post = mongoose.model("post", postSchema, "posts");
module.exports = Post;
