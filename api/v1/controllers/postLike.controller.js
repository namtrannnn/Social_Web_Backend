const mongoose = require("mongoose");
const Like = require("../models/postLike.model");
const Post = require("../models/post.model");

const { canViewPost } = require("../../helpers/postVisibility.helper");

// [POST] /api/v1/post/toggle-like/:postId
module.exports.toggleLike = async (req, res) => {
  try {
    const userId = req.user._id;
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        code: 400,
        message: "ID bài viết không hợp lệ",
      });
    }

    const post = await Post.findOne({
      _id: postId,
      status: "active",
    });

    if (!post) {
      return res.status(404).json({
        code: 404,
        message: "Bài viết không tồn tại hoặc đã bị ẩn/xóa",
      });
    }

    const existingLike = await Like.findOne({
      post: postId,
      user: userId,
    });

    if (existingLike) {
      await existingLike.deleteOne();

      await Post.updateOne(
        { _id: postId, likesCount: { $gt: 0 } },
        { $inc: { likesCount: -1 } },
      );

      return res.status(200).json({
        code: 200,
        message: "Bỏ thích bài viết thành công",
        data: {
          postId,
          isLiked: false,
        },
      });
    }

    await Like.create({
      post: postId,
      user: userId,
    });

    await Post.updateOne({ _id: postId }, { $inc: { likesCount: 1 } });

    return res.status(200).json({
      code: 200,
      message: "Thích bài viết thành công",
      data: {
        postId,
        isLiked: true,
      },
    });
  } catch (error) {
    console.error("toggleLike error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [GET] /api/v1/post/likes/:postId
module.exports.getUsersLikedPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        code: 400,
        message: "ID bài viết không hợp lệ",
      });
    }

    const post = await Post.findOne({
      _id: postId,
      status: "active",
    }).populate(
      "author",
      "fullName username avatar isVerified followers friendList",
    );

    if (!post) {
      return res.status(404).json({
        code: 404,
        message: "Bài viết không tồn tại hoặc đã bị ẩn/xóa",
      });
    }

    const canView = canViewPost(post, req.user._id, post.author);

    if (!canView) {
      return res.status(403).json({
        code: 403,
        message: "Bạn không có quyền xem danh sách lượt thích của bài viết này",
      });
    }

    const total = await Like.countDocuments({ post: postId });

    const likes = await Like.find({ post: postId })
      .populate("user", "fullName username avatar isVerified")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const users = likes
      .filter((item) => item.user)
      .map((item) => ({
        likeId: item._id,
        likedAt: item.createdAt,
        user: item.user,
      }));

    return res.status(200).json({
      code: 200,
      message: "Lấy danh sách người thích bài viết thành công",
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("getUsersLikedPost error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};
