const mongoose = require("mongoose");
const Comment = require("../models/postComment.model");
const Post = require("../models/post.model");
const User = require("../models/user.model");

const { canViewPost } = require("../../../helpers/postVisibility.helper");
async function finalizeExpiredPendingDeleteComments(postId = null) {
  const now = new Date();

  const filter = {
    status: "pending_delete",
    canUndoUntil: { $lte: now },
  };

  if (postId && mongoose.Types.ObjectId.isValid(postId)) {
    filter.post = postId;
  }

  const expiredComments = await Comment.find(filter).select("_id post");

  if (!expiredComments.length) return;

  const postCountMap = new Map();

  for (const item of expiredComments) {
    const key = item.post.toString();
    postCountMap.set(key, (postCountMap.get(key) || 0) + 1);
  }

  await Comment.updateMany(filter, {
    $set: {
      status: "deleted",
      pendingDeleteAt: null,
      canUndoUntil: null,
    },
  });

  for (const [postIdKey, count] of postCountMap.entries()) {
    await Post.updateOne(
      { _id: postIdKey },
      { $inc: { commentsCount: -count } },
    );
  }
}
// =========================
// [POST] /api/v1/post/comment/:postId
// =========================
module.exports.createComment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { postId } = req.params;
    let { content, parentComment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        code: 400,
        message: "ID bài viết không hợp lệ",
      });
    }

    content = typeof content === "string" ? content.trim() : "";

    if (!content) {
      return res.status(400).json({
        code: 400,
        message: "Nội dung bình luận không được để trống",
      });
    }

    const post = await Post.findOne({
      _id: postId,
      status: "active",
    }).populate("author", "followers friendList");

    if (!post) {
      return res.status(404).json({
        code: 404,
        message: "Bài viết không tồn tại",
      });
    }

    const canView = canViewPost(post, userId, post.author);

    if (!canView) {
      return res.status(403).json({
        code: 403,
        message: "Bạn không có quyền bình luận bài viết này",
      });
    }

    let parent = null;

    if (parentComment) {
      if (!mongoose.Types.ObjectId.isValid(parentComment)) {
        return res.status(400).json({
          code: 400,
          message: "ID comment cha không hợp lệ",
        });
      }

      parent = await Comment.findOne({
        _id: parentComment,
        post: postId,
        status: "active",
      });

      if (!parent) {
        return res.status(404).json({
          code: 404,
          message: "Comment cha không tồn tại",
        });
      }
    }
    if (!post.allowComments) {
      return res.status(403).json({
        code: 403,
        message: "Bài viết này đã tắt bình luận",
      });
    }
    const newComment = await Comment.create({
      post: postId,
      user: userId,
      content,
      parentComment: parent ? parent._id : null,
    });

    // tăng số comment
    await Post.updateOne({ _id: postId }, { $inc: { commentsCount: 1 } });

    const commentDetail = await Comment.findById(newComment._id).populate(
      "user",
      "fullName username avatar isVerified",
    );
    const roomName = `post:${postId}`;

    global._io.to(roomName).emit("SERVER_RETURN_NEW_COMMENT", {
      postId: postId,
      comment: {
        ...commentDetail.toObject(),
        parentComment: commentDetail.parentComment || null,
      },
    });

    return res.status(201).json({
      code: 201,
      message: "Bình luận thành công",
      data: commentDetail,
    });
  } catch (error) {
    console.error("createComment error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
    });
  }
};

// =========================
// [GET] /api/v1/post/comment/:postId
module.exports.getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const viewerId = req.user._id;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        code: 400,
        message: "ID bài viết không hợp lệ",
      });
    }
    await finalizeExpiredPendingDeleteComments(postId);
    const post = await Post.findById(postId).populate(
      "author",
      "followers friendList",
    );

    if (!post || post.status !== "active") {
      return res.status(404).json({
        code: 404,
        message: "Bài viết không tồn tại",
      });
    }

    const canView = canViewPost(post, viewerId, post.author);

    if (!canView) {
      return res.status(403).json({
        code: 403,
        message: "Bạn không có quyền xem comment",
      });
    }

    const isPostOwner = post.author._id.toString() === viewerId.toString();

    const visibleStatuses = isPostOwner ? ["active", "hidden"] : ["active"];

    const parentComments = await Comment.find({
      post: postId,
      parentComment: null,
      status: { $in: visibleStatuses },
    })
      .populate("user", "fullName username avatar isVerified")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const parentIds = parentComments.map((c) => c._id);

    const replies = await Comment.find({
      parentComment: { $in: parentIds },
      status: { $in: visibleStatuses },
    }).populate("user", "fullName username avatar isVerified");

    const replyMap = new Map();

    for (const reply of replies) {
      const key = reply.parentComment.toString();
      if (!replyMap.has(key)) replyMap.set(key, []);
      replyMap.get(key).push(reply);
    }

    const finalComments = parentComments.map((comment) => ({
      ...comment.toObject(),
      replies: replyMap.get(comment._id.toString()) || [],
    }));

    const total = await Comment.countDocuments({
      post: postId,
      parentComment: null,
      status: { $in: visibleStatuses },
    });

    return res.status(200).json({
      code: 200,
      message: "Lấy danh sách comment thành công",
      data: finalComments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("getCommentsByPost error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [PATCH] /api/v1/post/comment/hide/:commentId
module.exports.hideComment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        code: 400,
        message: "ID comment không hợp lệ",
      });
    }

    const comment = await Comment.findOne({
      _id: commentId,
      status: "active",
    });

    if (!comment) {
      return res.status(404).json({
        code: 404,
        message: "Comment không tồn tại hoặc không thể ẩn",
      });
    }

    const post = await Post.findById(comment.post);

    if (!post || post.status !== "active") {
      return res.status(404).json({
        code: 404,
        message: "Bài viết không tồn tại",
      });
    }

    // chỉ chủ post được ẩn comment
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        code: 403,
        message: "Bạn không có quyền ẩn comment này",
      });
    }

    comment.status = "hidden";
    await comment.save();

    const roomName = `post:${comment.post.toString()}`;

    global._io.to(roomName).emit("SERVER_RETURN_HIDE_COMMENT", {
      postId: comment.post,
      commentId: comment._id,
      parentComment: comment.parentComment || null,
    });

    return res.status(200).json({
      code: 200,
      message: "Ẩn bình luận thành công",
    });
  } catch (error) {
    console.error("hideComment error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [PATCH] /api/v1/post/comment/edit/:commentId
module.exports.editComment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { commentId } = req.params;
    let { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        code: 400,
        message: "ID comment không hợp lệ",
      });
    }

    content = typeof content === "string" ? content.trim() : "";

    if (!content) {
      return res.status(400).json({
        code: 400,
        message: "Nội dung bình luận không được để trống",
      });
    }

    const comment = await Comment.findOne({
      _id: commentId,
      status: "active",
    });

    if (!comment) {
      return res.status(404).json({
        code: 404,
        message: "Comment không tồn tại",
      });
    }

    if (comment.user.toString() !== userId.toString()) {
      return res.status(403).json({
        code: 403,
        message: "Bạn không có quyền sửa comment này",
      });
    }

    if (comment.content === content) {
      return res.status(200).json({
        code: 200,
        message: "Không có thay đổi nội dung",
        data: comment,
      });
    }

    comment.editHistory.push({
      oldContent: comment.content,
      editedAt: new Date(),
    });

    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = new Date();

    await comment.save();

    const updatedComment = await Comment.findById(comment._id).populate(
      "user",
      "fullName username avatar isVerified",
    );

    const roomName = `post:${comment.post.toString()}`;

    global._io.to(roomName).emit("SERVER_RETURN_UPDATE_COMMENT", {
      postId: comment.post,
      comment: updatedComment,
    });

    return res.status(200).json({
      code: 200,
      message: "Cập nhật comment thành công",
      data: updatedComment,
    });
  } catch (error) {
    console.error("editComment error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [GET] /api/v1/post/comment/history/:commentId
module.exports.getCommentEditHistory = async (req, res) => {
  try {
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        code: 400,
        message: "ID comment không hợp lệ",
      });
    }

    const comment = await Comment.findById(commentId)
      .populate("user", "fullName username avatar isVerified")
      .select("content isEdited editedAt editHistory user post status");

    if (!comment || comment.status === "deleted") {
      return res.status(404).json({
        code: 404,
        message: "Comment không tồn tại",
      });
    }

    return res.status(200).json({
      code: 200,
      message: "Lấy lịch sử chỉnh sửa comment thành công",
      data: {
        commentId: comment._id,
        currentContent: comment.content,
        isEdited: comment.isEdited,
        editedAt: comment.editedAt,
        editHistory: [...comment.editHistory].reverse(),
      },
    });
  } catch (error) {
    console.error("getCommentEditHistory error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [PATCH] /api/v1/post/comment/delete/:commentId
module.exports.deleteComment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        code: 400,
        message: "ID comment không hợp lệ",
      });
    }

    const comment = await Comment.findOne({
      _id: commentId,
      status: { $in: ["active", "hidden"] },
    });

    if (!comment) {
      return res.status(404).json({
        code: 404,
        message: "Comment không tồn tại",
      });
    }

    const post = await Post.findById(comment.post);

    if (!post || post.status !== "active") {
      return res.status(404).json({
        code: 404,
        message: "Bài viết không tồn tại",
      });
    }

    const isCommentOwner = comment.user.toString() === userId.toString();
    const isPostOwner = post.author.toString() === userId.toString();

    if (!isCommentOwner && !isPostOwner) {
      return res.status(403).json({
        code: 403,
        message: "Bạn không có quyền xóa comment này",
      });
    }

    const now = new Date();
    const undoUntil = new Date(now.getTime() + 5000);

    comment.status = "pending_delete";
    comment.pendingDeleteAt = now;
    comment.canUndoUntil = undoUntil;
    await comment.save();

    const roomName = `post:${comment.post.toString()}`;

    global._io.to(roomName).emit("SERVER_RETURN_PENDING_DELETE_COMMENT", {
      postId: comment.post,
      commentId: comment._id,
      parentComment: comment.parentComment || null,
      canUndoUntil: undoUntil,
    });

    return res.status(200).json({
      code: 200,
      message: "Comment đã được đưa vào trạng thái chờ xóa",
      data: {
        commentId: comment._id,
        status: comment.status,
        canUndoUntil: undoUntil,
      },
    });
  } catch (error) {
    console.error("deleteComment error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [PATCH] /api/v1/post/comment/undo-delete/:commentId
module.exports.undoDeleteComment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        code: 400,
        message: "ID comment không hợp lệ",
      });
    }

    const comment = await Comment.findOne({
      _id: commentId,
      status: "pending_delete",
    });

    if (!comment) {
      return res.status(404).json({
        code: 404,
        message: "Comment không ở trạng thái có thể hoàn tác",
      });
    }

    const post = await Post.findById(comment.post);

    if (!post || post.status !== "active") {
      return res.status(404).json({
        code: 404,
        message: "Bài viết không tồn tại",
      });
    }

    const isCommentOwner = comment.user.toString() === userId.toString();
    const isPostOwner = post.author.toString() === userId.toString();

    if (!isCommentOwner && !isPostOwner) {
      return res.status(403).json({
        code: 403,
        message: "Bạn không có quyền hoàn tác xóa comment này",
      });
    }

    if (!comment.canUndoUntil || new Date() > new Date(comment.canUndoUntil)) {
      return res.status(400).json({
        code: 400,
        message: "Đã hết thời gian hoàn tác",
      });
    }

    comment.status = "active";
    comment.pendingDeleteAt = null;
    comment.canUndoUntil = null;
    await comment.save();

    const restoredComment = await Comment.findById(comment._id).populate(
      "user",
      "fullName username avatar isVerified",
    );

    const roomName = `post:${comment.post.toString()}`;

    global._io.to(roomName).emit("SERVER_RETURN_UNDO_DELETE_COMMENT", {
      postId: comment.post,
      comment: restoredComment,
    });

    return res.status(200).json({
      code: 200,
      message: "Hoàn tác xóa comment thành công",
      data: restoredComment,
    });
  } catch (error) {
    console.error("undoDeleteComment error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};
