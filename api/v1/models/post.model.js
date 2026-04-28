const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    caption: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2200,
    },

    media: [
      {
        url: { type: String, required: true, trim: true },
        public_id: { type: String, default: "", trim: true },
        type: {
          type: String,
          enum: ["image", "video"],
          default: "image",
        },
        thumbnail: { type: String, default: "", trim: true },
        width: { type: Number, default: 0 },
        height: { type: Number, default: 0 },
      },
    ],

    location: {
      type: String,
      default: "",
      trim: true,
    },

    hashtags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],

    taggedUsers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
        },
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
      },
    ],

    likesCount: {
      type: Number,
      default: 0,
    },

    commentsCount: {
      type: Number,
      default: 0,
    },

    savesCount: {
      type: Number,
      default: 0,
    },
    sharesCount: {
      type: Number,
      default: 0,
    },
    allowComments: {
      type: Boolean,
      default: true,
    },

    hideLikeCount: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["active", "hidden", "deleted"],
      default: "active",
    },

    isEdited: {
      type: Boolean,
      default: false,
    },

    editedAt: {
      type: Date,
      default: null,
    },
    visibility: {
      type: String,
      enum: ["public", "followers", "friends", "private", "custom"],
      default: "public",
    },

    allowedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],
  },
  {
    timestamps: true,
  },
);

postSchema.index({ author: 1, createdAt: -1 });

const Post = mongoose.model("post", postSchema, "posts");
module.exports = Post;
