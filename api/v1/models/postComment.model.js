const mongoose = require("mongoose");

const commentEditHistorySchema = new mongoose.Schema(
  {
    oldContent: {
      type: String,
      trim: true,
      default: "",
    },
    editedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const commentSchema = new mongoose.Schema(
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
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comment",
      default: null,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "hidden", "pending_delete", "deleted"],
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
    editHistory: {
      type: [commentEditHistorySchema],
      default: [],
    },

    pendingDeleteAt: {
      type: Date,
      default: null,
    },
    canUndoUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

commentSchema.index({ post: 1, parentComment: 1, status: 1, createdAt: -1 });

const Comment = mongoose.model("comment", commentSchema, "comments");
module.exports = Comment;
