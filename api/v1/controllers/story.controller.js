const mongoose = require("mongoose");
const Story = require("../models/story.model");
const Post = require("../models/post.model");
const User = require("../models/user.model");

const uploadStreamToCloudinary = require("../../../helpers/cloudinary.helper");

const { canViewStory } = require("../../../helpers/storyVisibility.helper");
const {
  parseAllowedUsers,
  normalizeVisibility,
} = require("../../../helpers/postUtils.helper");

const STORY_EXPIRE_MS = 24 * 60 * 60 * 1000;

function getExpiresAt() {
  return new Date(Date.now() + STORY_EXPIRE_MS);
}

function parseJsonArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

// [POST] /api/v1/story/create
exports.createStory = async (req, res) => {
  try {
    const userId = req.user._id;

    let {
      caption = "",
      mentions = [],
      visibility = "followers",
      allowedUsers = [],
      allowReply = true,
      allowShare = true,
    } = req.body;

    const file = req.file;

    if (!file) {
      return res.status(400).json({
        code: 400,
        message: "Story phải có ảnh hoặc video",
      });
    }

    caption = typeof caption === "string" ? caption.trim() : "";
    mentions = parseJsonArray(mentions);

    visibility = normalizeVisibility(visibility);
    allowedUsers = parseAllowedUsers(allowedUsers);

    if (visibility !== "custom") {
      allowedUsers = [];
    }

    const result = await uploadStreamToCloudinary(file.buffer, "/stories");

    const mediaType = file.mimetype.startsWith("video/") ? "video" : "image";

    const story = await Story.create({
      author: userId,
      type: mediaType,
      media: {
        url: result.url,
        public_id: result.public_id,
        type: mediaType,
        thumbnail: "",
        width: result.width || 0,
        height: result.height || 0,
      },
      caption,
      mentions,
      visibility,
      allowedUsers,
      allowReply: String(allowReply) === "false" ? false : true,
      allowShare: String(allowShare) === "false" ? false : true,
      expiresAt: getExpiresAt(),
    });

    const storyDetail = await Story.findById(story._id)
      .populate("author", "fullName username avatar isVerified")
      .populate("mentions", "fullName username avatar isVerified")
      .populate("allowedUsers", "fullName username avatar isVerified");

    return res.status(201).json({
      code: 201,
      message: "Tạo story thành công",
      data: storyDetail,
    });
  } catch (error) {
    console.error("createStory error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [POST] /api/v1/story/share-post/:postId
exports.sharePostToStory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { postId } = req.params;

    let {
      caption = "",
      visibility = "followers",
      allowedUsers = [],
      allowReply = true,
      allowShare = true,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        code: 400,
        message: "ID bài viết không hợp lệ",
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

    visibility = normalizeVisibility(visibility);
    allowedUsers = parseAllowedUsers(allowedUsers);

    if (visibility !== "custom") {
      allowedUsers = [];
    }

    const story = await Story.create({
      author: userId,
      type: "post",
      post: postId,
      caption: typeof caption === "string" ? caption.trim() : "",
      visibility,
      allowedUsers,
      allowReply: String(allowReply) === "false" ? false : true,
      allowShare: String(allowShare) === "false" ? false : true,
      expiresAt: getExpiresAt(),
    });

    await Post.findByIdAndUpdate(postId, {
      $inc: { sharesCount: 1 },
    });

    const storyDetail = await Story.findById(story._id)
      .populate("author", "fullName username avatar isVerified")
      .populate({
        path: "post",
        populate: {
          path: "author",
          select: "fullName username avatar isVerified",
        },
      })
      .populate("allowedUsers", "fullName username avatar isVerified");

    return res.status(201).json({
      code: 201,
      message: "Chia sẻ bài viết lên story thành công",
      data: storyDetail,
    });
  } catch (error) {
    console.error("sharePostToStory error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [GET] /api/v1/story/feed
exports.getStoryFeed = async (req, res) => {
  try {
    const viewerId = req.user._id;

    const currentUser = await User.findById(viewerId).select(
      "following friendList",
    );

    const followingIds = currentUser?.following || [];

    const authorIds = [...followingIds, viewerId];

    const stories = await Story.find({
      author: { $in: authorIds },
      status: "active",
      expiresAt: { $gt: new Date() },
    })
      .populate(
        "author",
        "fullName username avatar isVerified followers friendList",
      )
      .populate({
        path: "post",
        populate: {
          path: "author",
          select: "fullName username avatar isVerified",
        },
      })
      .sort({ createdAt: 1 });

    const visibleStories = stories.filter((story) =>
      canViewStory(story, viewerId, story.author),
    );

    const groupedMap = new Map();

    visibleStories.forEach((story) => {
      const authorId = story.author._id.toString();

      if (!groupedMap.has(authorId)) {
        groupedMap.set(authorId, {
          author: story.author,
          stories: [],
          hasUnviewed: false,
        });
      }

      const storyObj = story.toObject();

      const isViewed = (story.viewers || []).some(
        (item) => item.user.toString() === viewerId.toString(),
      );

      storyObj.isViewed = isViewed;

      if (!isViewed) {
        groupedMap.get(authorId).hasUnviewed = true;
      }

      groupedMap.get(authorId).stories.push(storyObj);
    });

    return res.status(200).json({
      code: 200,
      message: "Lấy story feed thành công",
      data: Array.from(groupedMap.values()),
    });
  } catch (error) {
    console.error("getStoryFeed error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [GET] /api/v1/story/me
exports.getMyStories = async (req, res) => {
  try {
    const userId = req.user._id;

    const stories = await Story.find({
      author: userId,
      status: "active",
      expiresAt: { $gt: new Date() },
    })
      .populate("author", "fullName username avatar isVerified")
      .populate({
        path: "post",
        populate: {
          path: "author",
          select: "fullName username avatar isVerified",
        },
      })
      .sort({ createdAt: 1 });

    return res.status(200).json({
      code: 200,
      message: "Lấy story của tôi thành công",
      data: stories,
    });
  } catch (error) {
    console.error("getMyStories error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [GET] /api/v1/story/user/:userId
exports.getStoriesByUser = async (req, res) => {
  try {
    const viewerId = req.user._id;
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        code: 400,
        message: "ID người dùng không hợp lệ",
      });
    }

    const author = await User.findById(userId).select(
      "fullName username avatar isVerified followers friendList",
    );

    if (!author) {
      return res.status(404).json({
        code: 404,
        message: "Người dùng không tồn tại",
      });
    }

    const stories = await Story.find({
      author: userId,
      status: "active",
      expiresAt: { $gt: new Date() },
    })
      .populate("author", "fullName username avatar isVerified")
      .populate({
        path: "post",
        populate: {
          path: "author",
          select: "fullName username avatar isVerified",
        },
      })
      .sort({ createdAt: 1 });

    const visibleStories = stories.filter((story) =>
      canViewStory(story, viewerId, author),
    );

    return res.status(200).json({
      code: 200,
      message: "Lấy story theo user thành công",
      data: visibleStories,
    });
  } catch (error) {
    console.error("getStoriesByUser error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [POST] /api/v1/story/view/:storyId
exports.viewStory = async (req, res) => {
  try {
    const viewerId = req.user._id;
    const { storyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        code: 400,
        message: "ID story không hợp lệ",
      });
    }

    const story = await Story.findOne({
      _id: storyId,
      status: "active",
      expiresAt: { $gt: new Date() },
    }).populate("author", "followers friendList");

    if (!story) {
      return res.status(404).json({
        code: 404,
        message: "Story không tồn tại hoặc đã hết hạn",
      });
    }

    const canView = canViewStory(story, viewerId, story.author);

    if (!canView) {
      return res.status(403).json({
        code: 403,
        message: "Bạn không có quyền xem story này",
      });
    }

    const alreadyViewed = story.viewers.some(
      (item) => item.user.toString() === viewerId.toString(),
    );

    if (!alreadyViewed) {
      story.viewers.push({
        user: viewerId,
        viewedAt: new Date(),
      });

      story.viewersCount += 1;

      await story.save();
    }

    return res.status(200).json({
      code: 200,
      message: "Đã xem story",
      data: {
        storyId: story._id,
        viewersCount: story.viewersCount,
      },
    });
  } catch (error) {
    console.error("viewStory error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [GET] /api/v1/story/viewers/:storyId
exports.getStoryViewers = async (req, res) => {
  try {
    const userId = req.user._id;
    const { storyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        code: 400,
        message: "ID story không hợp lệ",
      });
    }

    const story = await Story.findById(storyId).populate(
      "viewers.user",
      "fullName username avatar isVerified",
    );

    if (!story) {
      return res.status(404).json({
        code: 404,
        message: "Story không tồn tại",
      });
    }

    if (story.author.toString() !== userId.toString()) {
      return res.status(403).json({
        code: 403,
        message: "Bạn không có quyền xem danh sách người xem",
      });
    }

    return res.status(200).json({
      code: 200,
      message: "Lấy danh sách người xem thành công",
      data: {
        viewersCount: story.viewersCount,
        viewers: story.viewers,
      },
    });
  } catch (error) {
    console.error("getStoryViewers error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [PATCH] /api/v1/story/delete/:storyId
exports.deleteStory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { storyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        code: 400,
        message: "ID story không hợp lệ",
      });
    }

    const story = await Story.findOne({
      _id: storyId,
      author: userId,
      status: { $ne: "deleted" },
    });

    if (!story) {
      return res.status(404).json({
        code: 404,
        message: "Story không tồn tại hoặc bạn không có quyền xóa",
      });
    }

    story.status = "deleted";
    await story.save();

    return res.status(200).json({
      code: 200,
      message: "Xóa story thành công",
    });
  } catch (error) {
    console.error("deleteStory error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};
