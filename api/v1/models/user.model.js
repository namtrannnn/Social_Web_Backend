const mongoose = require("mongoose");
const generate = require("../../../helpers/generate.helper");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    tokenUser: {
      type: String,
      default: () => generate.generateString(20),
    },

    avatar: {
      type: String,
      default:
        "https://res-console.cloudinary.com/dn2u3dcrh/thumbnails/v1/image/upload/v1751875520/c29jaWFsLWZiL3VzZXJzL2ltZ191c2VyX2RlZmF1bHRfZTBlNWNs/drilldown",
    },

    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active",
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    statusOnline: {
      type: String,
      enum: ["online", "offline", "away"],
      default: "offline",
    },

    requestFriends: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],

    acceptFriends: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],

    friendList: [
      {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        room_chat_id: { type: mongoose.Schema.Types.ObjectId, ref: "roomChat" },
      },
    ],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],

    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    deleted: {
      type: Boolean,
      default: false,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    bio: {
      type: String,
      default: "",
      maxlength: 150,
    },

    postsCount: {
      type: Number,
      default: 0,
    },

    followersCount: {
      type: Number,
      default: 0,
    },

    followingCount: {
      type: Number,
      default: 0,
    },

    isPrivate: {
      type: Boolean,
      default: false,
    },
    lastSelectedAudience: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    lastAudienceSetting: {
      type: String,
      enum: ["public", "followers", "friends", "private", "custom"],
      default: "public",
    },
    pinnedPosts: [
      {
        post: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "post",
        },
        pinnedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("user", userSchema, "users");
module.exports = User;
