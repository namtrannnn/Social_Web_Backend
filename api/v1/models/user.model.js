const mongoose = require("mongoose");
const generate = require("../../../helpers/generate.helper");

const userSchema = new mongoose.Schema(
  {
    fullName: String,
    email: String,
    password: String,
    tokenUser: {
      type: String,
      default: generate.generateString(20),
    },
    avatar: {
      type: String,
      default:
        "https://res-console.cloudinary.com/dn2u3dcrh/thumbnails/v1/image/upload/v1751875520/c29jaWFsLWZiL3VzZXJzL2ltZ191c2VyX2RlZmF1bHRfZTBlNWNs/drilldown",
    },
    status: {
      type: String,
      default: "active",
    },
    position: Number,
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      default: "user",
    },
    statusOnline: String,
    requestFriends: [String],
    acceptFriends: [String],
    friendList: [
      {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        room_chat_id: { type: mongoose.Schema.Types.ObjectId, ref: "roomChat" },
      },
    ],
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("user", userSchema, "users");
module.exports = User;
