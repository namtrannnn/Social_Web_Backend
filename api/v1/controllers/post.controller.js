const Post = require("../models/post.model");
const User = require("../models/user.model");
const Like = require("../models/postLike.model");
const uploadStreamToCloudinary = require("../../../helpers/cloudinary.helper");
const mongoose = require("mongoose");

const { canViewPost } = require("../../../helpers/postVisibility.helper");
const {
  parseAllowedUsers,
  normalizeVisibility,
  extractHashtags,
} = require("../../../helpers/postUtils.helper");

const {
  calculatePostScore,
  calculateFreshnessScore,
  calculateAffinityScore,
  calculateInterestMatchScore,
  calculateSourceBonus,
  uniquePostsById,
  attachSourceType,
  getUserInterestHashtags,
} = require("../../../helpers/postScore.helper");

// [POST] /api/v1/post/create
module.exports.createPost = async (req, res) => {
  try {
    console.log("=== CREATE POST START ===");

    const user = req.user;
    console.log("user:", user?._id);

    let {
      caption = "",
      location = "",
      mentions = [],
      taggedUsers = [],
      allowComments = true,
      hideLikeCount = false,
      visibility = "public",
      allowedUsers = [],
    } = req.body;
    console.log("req.body ban dau:", req.body);

    caption = typeof caption === "string" ? caption.trim() : "";
    location = typeof location === "string" ? location.trim() : "";

    const files = req.files || [];
    console.log("so file upload:", files.length);

    if (typeof mentions === "string") {
      try {
        mentions = JSON.parse(mentions);
      } catch (err) {
        console.log("mentions parse loi");
        mentions = [];
      }
    }

    if (typeof taggedUsers === "string") {
      try {
        taggedUsers = JSON.parse(taggedUsers);
      } catch (err) {
        console.log("taggedUsers parse loi");
        taggedUsers = [];
      }
    }

    if (!Array.isArray(mentions)) mentions = [];
    if (!Array.isArray(taggedUsers)) taggedUsers = [];

    console.log("mentions sau parse:", mentions);
    console.log("taggedUsers sau parse:", taggedUsers);
    visibility = normalizeVisibility(visibility);
    allowedUsers = parseAllowedUsers(allowedUsers);

    if (visibility !== "custom") {
      allowedUsers = [];
    }
    if (!caption && files.length === 0) {
      console.log("Khong co caption va khong co media");
      return res.status(400).json({
        code: 400,
        message: "Bài viết phải có caption hoặc ít nhất 1 media",
      });
    }

    if (files.length > 10) {
      console.log("Vuot qua 10 media");
      return res.status(400).json({
        code: 400,
        message: "Một bài viết chỉ được tối đa 10 media",
      });
    }

    const uploadedMedia = [];

    for (const file of files) {
      console.log("dang upload file:", file.originalname);

      const result = await uploadStreamToCloudinary(file.buffer, "/posts");

      console.log("upload cloudinary xong:", result);

      uploadedMedia.push({
        url: result.url,
        public_id: result.public_id,
        type: file.mimetype.startsWith("video/") ? "video" : "image",
        thumbnail: "",
        width: 0,
        height: 0,
      });
    }

    const normalizedTaggedUsers = taggedUsers
      .filter((item) => item && item.user)
      .map((item) => ({
        user: item.user,
        x: Number(item.x) || 0,
        y: Number(item.y) || 0,
      }));

    console.log("normalizedTaggedUsers:", normalizedTaggedUsers);

    const hashtags = extractHashtags(caption);
    console.log("hashtags:", hashtags);

    const newPost = new Post({
      author: user._id,
      caption,
      media: uploadedMedia,
      location,
      hashtags,
      mentions,
      taggedUsers: normalizedTaggedUsers,
      allowComments: String(allowComments) === "false" ? false : true,
      hideLikeCount: String(hideLikeCount) === "true",
      visibility,
      allowedUsers,
    });

    console.log("Du lieu truoc khi save:");
    console.log(JSON.stringify(newPost, null, 2));

    console.log("OK - da chay toi truoc newPost.save()");

    await newPost.save();
    console.log("OK - save thanh cong");

    await User.updateOne({ _id: user._id }, { $inc: { postsCount: 1 } });
    await updateLastAudienceSetting(user._id, visibility, allowedUsers);
    console.log("OK - update postsCount thanh cong");

    const postDetail = await Post.findById(newPost._id)
      .populate("author", "fullName username avatar isVerified")
      .populate("allowedUsers", "fullName username avatar isVerified");

    console.log("=== CREATE POST SUCCESS ===");

    return res.status(201).json({
      code: 201,
      message: "Tạo bài viết thành công",
      data: postDetail,
    });
  } catch (error) {
    console.error("createPost error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [PATCH] /api/v1/post/edit/:id
module.exports.editPost = async (req, res) => {
  try {
    const user = req.user;
    const postId = req.params.id;

    let {
      caption,
      location,
      mentions,
      taggedUsers,
      allowComments,
      hideLikeCount,
      visibility,
      allowedUsers,
    } = req.body;

    const post = await Post.findOne({
      _id: postId,
      status: { $ne: "deleted" },
    });

    if (!post) {
      return res.status(404).json({
        code: 404,
        message: "Bài viết không tồn tại",
      });
    }

    if (post.author.toString() !== user._id.toString()) {
      return res.status(403).json({
        code: 403,
        message: "Bạn không có quyền sửa bài viết này",
      });
    }
    let parsedAllowedUsers;
    let normalizedNewVisibility;

    if (visibility !== undefined) {
      normalizedNewVisibility = normalizeVisibility(visibility);
      updateData.visibility = normalizedNewVisibility;
    }

    if (allowedUsers !== undefined) {
      parsedAllowedUsers = parseAllowedUsers(allowedUsers);
      updateData.allowedUsers = parsedAllowedUsers;
    }
    const updateData = {};

    if (caption !== undefined) {
      caption = typeof caption === "string" ? caption.trim() : "";
      updateData.caption = caption;
      updateData.hashtags = extractHashtags(caption);
    }

    if (location !== undefined) {
      updateData.location = typeof location === "string" ? location.trim() : "";
    }

    if (allowComments !== undefined) {
      updateData.allowComments =
        String(allowComments) === "false" ? false : true;
    }

    if (hideLikeCount !== undefined) {
      updateData.hideLikeCount = String(hideLikeCount) === "true";
    }

    if (mentions !== undefined) {
      if (typeof mentions === "string") {
        try {
          mentions = JSON.parse(mentions);
        } catch {
          mentions = [];
        }
      }

      updateData.mentions = Array.isArray(mentions) ? mentions : [];
    }

    if (taggedUsers !== undefined) {
      if (typeof taggedUsers === "string") {
        try {
          taggedUsers = JSON.parse(taggedUsers);
        } catch {
          taggedUsers = [];
        }
      }

      updateData.taggedUsers = Array.isArray(taggedUsers)
        ? taggedUsers
            .filter((item) => item && item.user)
            .map((item) => ({
              user: item.user,
              x: Number(item.x) || 0,
              y: Number(item.y) || 0,
            }))
        : [];
    }
    const finalVisibility =
      updateData.visibility !== undefined
        ? updateData.visibility
        : post.visibility;

    if (finalVisibility !== "custom") {
      updateData.allowedUsers = [];
    } else if (updateData.allowedUsers === undefined) {
      updateData.allowedUsers = post.allowedUsers || [];
    }
    updateData.isEdited = true;
    updateData.editedAt = new Date();

    const updatedPost = await Post.findByIdAndUpdate(postId, updateData, {
      new: true,
    })
      .populate("author", "fullName username avatar isVerified")
      .populate("allowedUsers", "fullName username avatar isVerified");
    await updateLastAudienceSetting(
      user._id,
      updatedPost.visibility,
      updatedPost.allowedUsers || [],
    );

    return res.status(200).json({
      code: 200,
      message: "Cập nhật bài viết thành công",
      data: updatedPost,
    });
  } catch (error) {
    console.error("editPost error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// =========================
// [GET] /api/v1/post/feed
// =========================
module.exports.getFeedPosts = async (req, res) => {
  try {
    const user = req.user;
    const limit = Math.min(Number(req.query.limit) || 10, 20);

    // 1. Lấy following
    const currentUser = await User.findById(user._id).select("following");
    const followingIds = currentUser?.following || [];

    // 2. Lấy hashtag sở thích của user
    const userInterestHashtags = await getUserInterestHashtags(user._id);

    // 3. Lấy bài của mình + following
    const followingPostsRaw = await Post.find({
      author: { $in: [...followingIds, user._id] },
      status: "active",
    })
      .populate("author", "fullName username avatar isVerified")
      .sort({ createdAt: -1 })
      .limit(30);

    // 4. Lấy bài gợi ý theo sở thích (người lạ nhưng hợp hashtag)
    let interestPostsRaw = [];

    if (userInterestHashtags.length > 0) {
      interestPostsRaw = await Post.find({
        author: { $nin: [...followingIds, user._id] },
        status: "active",
        hashtags: { $in: userInterestHashtags },
      })
        .populate("author", "fullName username avatar isVerified")
        .sort({ createdAt: -1 })
        .limit(20);
    }

    // 5. Lấy bài đang hot
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const hotPostsRaw = await Post.find({
      author: { $ne: user._id },
      status: "active",
      createdAt: { $gte: sevenDaysAgo },
    })
      .populate("author", "fullName username avatar isVerified")
      .sort({
        likesCount: -1,
        commentsCount: -1,
        savesCount: -1,
        createdAt: -1,
      })
      .limit(20);

    // 6. Gắn loại nguồn
    const followingPosts = attachSourceType(followingPostsRaw, "following");
    const interestPosts = attachSourceType(interestPostsRaw, "interest");
    const hotPosts = attachSourceType(hotPostsRaw, "hot");

    // 7. Gộp tất cả
    const mergedPosts = [...followingPosts, ...interestPosts, ...hotPosts];
    const authorIds = [
      ...new Set(
        mergedPosts.map((post) => post.author?._id?.toString()).filter(Boolean),
      ),
    ];

    const authors = await User.find({
      _id: { $in: authorIds },
    }).select("followers friendList");

    const authorMap = new Map(
      authors.map((author) => [author._id.toString(), author]),
    );

    const visiblePosts = mergedPosts.filter((post) => {
      const author = authorMap.get(post.author?._id?.toString());
      if (!author) return false;
      return canViewPost(post, user._id, author);
    });
    // 8. Bỏ trùng
    const uniquePosts = uniquePostsById(visiblePosts);

    // 9. Tính điểm
    const scoredPosts = uniquePosts.map((post) =>
      calculatePostScore(post, user._id, followingIds, userInterestHashtags),
    );

    // 10. Sort theo score giảm dần
    scoredPosts.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const finalPostsSlice = scoredPosts.slice(0, limit);

    const postIds = finalPostsSlice.map((post) => post._id);

    const likedPosts = await Like.find({
      user: user._id,
      post: { $in: postIds },
    }).select("post");

    const likedSet = new Set(likedPosts.map((item) => item.post.toString()));

    const finalPosts = finalPostsSlice.map((post) => ({
      ...post,
      isLiked: likedSet.has(post._id.toString()),
    }));

    // 11. Trả kết quả
    return res.status(200).json({
      code: 200,
      message: "Lấy feed thành công",
      data: finalPosts,
      meta: {
        totalFetched: scoredPosts.length,
        returned: Math.min(limit, scoredPosts.length),
        userInterestHashtags,
      },
    });
  } catch (error) {
    console.error("getFeedPosts error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [GET] /api/v1/post/:id
module.exports.detailPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const viewerId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        code: 400,
        message: "ID bài viết không hợp lệ",
      });
    }

    const post = await Post.findOne({
      _id: postId,
      status: "active",
    })
      .populate(
        "author",
        "fullName username avatar isVerified followers friendList",
      )
      .populate("mentions", "fullName username avatar isVerified")
      .populate("taggedUsers.user", "fullName username avatar isVerified")
      .populate("allowedUsers", "fullName username avatar isVerified");

    if (!post) {
      return res.status(404).json({
        code: 404,
        message: "Bài viết không tồn tại hoặc đã bị ẩn/xóa",
      });
    }

    const canView = canViewPost(post, viewerId, post.author);

    if (!canView) {
      return res.status(403).json({
        code: 403,
        message: "Bạn không có quyền xem bài viết này",
      });
    }

    const liked = await Like.exists({
      post: post._id,
      user: viewerId,
    });

    const postData = post.toObject();
    postData.isLiked = !!liked;

    return res.status(200).json({
      code: 200,
      message: "Lấy chi tiết bài viết thành công",
      data: postData,
    });
  } catch (error) {
    console.error("detailPost error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [PATCH] /api/v1/post/delete/:id
module.exports.deletePost = async (req, res) => {
  try {
    const user = req.user;
    const postId = req.params.id;

    const post = await Post.findOne({
      _id: postId,
      status: { $ne: "deleted" },
    });

    if (!post) {
      return res.status(404).json({
        code: 404,
        message: "Bài viết không tồn tại",
      });
    }

    // chỉ cho chủ bài viết xóa
    if (post.author.toString() !== user._id.toString()) {
      return res.status(403).json({
        code: 403,
        message: "Bạn không có quyền xóa bài viết này",
      });
    }

    post.status = "deleted";
    await post.save();

    return res.status(200).json({
      code: 200,
      message: "Xóa bài viết thành công",
    });
  } catch (error) {
    console.error("deletePost error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
    });
  }
};

// [GET] /api/v1/post/user/:userId
module.exports.getPostsByUser = async (req, res) => {
  try {
    const viewerId = req.user._id;
    const userId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        code: 400,
        message: "ID người dùng không hợp lệ",
      });
    }

    const author = await User.findById(userId).select(
      "fullName username avatar isVerified followers friendList pinnedPosts",
    );

    if (!author) {
      return res.status(404).json({
        code: 404,
        message: "Người dùng không tồn tại",
      });
    }

    const posts = await Post.find({
      author: userId,
      status: "active",
    })
      .populate("author", "fullName username avatar isVerified")
      .populate("allowedUsers", "fullName username avatar isVerified")
      .sort({ createdAt: -1 });

    const visiblePosts = posts.filter((post) =>
      canViewPost(post, viewerId, author),
    );

    const pinnedPostIds = (author.pinnedPosts || [])
      .sort((a, b) => new Date(b.pinnedAt) - new Date(a.pinnedAt))
      .map((item) => item.post?.toString());

    const visiblePostMap = new Map(
      visiblePosts.map((post) => [post._id.toString(), post]),
    );

    const pinnedPosts = pinnedPostIds
      .map((id) => visiblePostMap.get(id))
      .filter(Boolean);

    const pinnedSet = new Set(pinnedPosts.map((post) => post._id.toString()));

    const normalPosts = visiblePosts.filter(
      (post) => !pinnedSet.has(post._id.toString()),
    );

    const allPosts = [...pinnedPosts, ...normalPosts];
    const postIds = allPosts.map((p) => p._id);

    const likedPosts = await Like.find({
      user: viewerId,
      post: { $in: postIds },
    }).select("post");

    const likedSet = new Set(likedPosts.map((i) => i.post.toString()));

    const pinnedPostsWithLike = pinnedPosts.map((post) => ({
      ...post.toObject(),
      isLiked: likedSet.has(post._id.toString()),
    }));

    const normalPostsWithLike = normalPosts.map((post) => ({
      ...post.toObject(),
      isLiked: likedSet.has(post._id.toString()),
    }));

    return res.status(200).json({
      code: 200,
      message: "Lấy bài viết theo user thành công",
      data: {
        pinnedPosts: pinnedPostsWithLike,
        posts: normalPostsWithLike,
      },
    });
  } catch (error) {
    console.error("getPostsByUser error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
    });
  }
};

// [GET] /api/v1/post/me
module.exports.getMyPosts = async (req, res) => {
  try {
    const user = req.user;

    const posts = await Post.find({
      author: user._id,
      status: { $ne: "deleted" },
    })
      .populate("author", "fullName username avatar isVerified")
      .populate("allowedUsers", "fullName username avatar isVerified")
      .sort({ createdAt: -1 });
    const postIds = posts.map((p) => p._id);

    const likedPosts = await Like.find({
      user: user._id,
      post: { $in: postIds },
    }).select("post");

    const likedSet = new Set(likedPosts.map((i) => i.post.toString()));

    const finalPosts = posts.map((post) => ({
      ...post.toObject(),
      isLiked: likedSet.has(post._id.toString()),
    }));
    return res.status(200).json({
      code: 200,
      message: "Lấy bài viết của tôi thành công",
      data: finalPosts,
    });
  } catch (error) {
    console.error("getMyPosts error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
    });
  }
};

// [GET] /api/v1/pin/:id
module.exports.pinPost = async (req, res) => {
  try {
    const userId = req.user._id;
    const postId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        code: 400,
        message: "ID bài viết không hợp lệ",
      });
    }

    const post = await Post.findOne({
      _id: postId,
      author: userId,
      status: "active",
    });

    if (!post) {
      return res.status(404).json({
        code: 404,
        message: "Bài viết không tồn tại hoặc bạn không có quyền ghim",
      });
    }

    const user = await User.findById(userId).select("pinnedPosts");

    const alreadyPinned = (user.pinnedPosts || []).some(
      (item) => item.post.toString() === postId,
    );

    if (alreadyPinned) {
      return res.status(200).json({
        code: 200,
        message: "Bài viết đã được ghim trước đó",
      });
    }

    user.pinnedPosts.push({
      post: post._id,
      pinnedAt: new Date(),
    });

    user.pinnedPosts.sort(
      (a, b) => new Date(b.pinnedAt) - new Date(a.pinnedAt),
    );

    await user.save();

    return res.status(200).json({
      code: 200,
      message: "Ghim bài viết thành công",
      data: user.pinnedPosts,
    });
  } catch (error) {
    console.error("pinPost error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

module.exports.unpinPost = async (req, res) => {
  try {
    const userId = req.user._id;
    const postId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        code: 400,
        message: "ID bài viết không hợp lệ",
      });
    }

    const user = await User.findById(userId).select("pinnedPosts");

    const beforeCount = user.pinnedPosts.length;

    user.pinnedPosts = (user.pinnedPosts || []).filter(
      (item) => item.post.toString() !== postId,
    );

    if (user.pinnedPosts.length === beforeCount) {
      return res.status(404).json({
        code: 404,
        message: "Bài viết chưa được ghim",
      });
    }

    await user.save();

    return res.status(200).json({
      code: 200,
      message: "Bỏ ghim bài viết thành công",
      data: user.pinnedPosts,
    });
  } catch (error) {
    console.error("unpinPost error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [GET] /api/v1/post/related/:id
module.exports.getRelatedPosts = async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await Post.findById(postId);

    if (!post || post.status !== "active") {
      return res.status(404).json({
        code: 404,
        message: "Bài viết không tồn tại",
      });
    }

    const relatedPostsRaw = await Post.find({
      _id: { $ne: postId },
      status: "active",
      $or: [{ hashtags: { $in: post.hashtags } }, { location: post.location }],
    })
      .populate(
        "author",
        "fullName username avatar isVerified followers friendList",
      )
      .sort({ createdAt: -1 })
      .limit(20);

    const relatedPosts = relatedPostsRaw
      .filter((item) => canViewPost(item, req.user._id, item.author))
      .slice(0, 10);

    return res.status(200).json({
      code: 200,
      message: "Lấy bài viết liên quan thành công",
      data: relatedPosts,
    });
  } catch (error) {
    console.error("getRelatedPosts error:", error);
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
    });
  }
};

exports.sharePost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findByIdAndUpdate(
      postId,
      { $inc: { sharesCount: 1 } },
      { new: true },
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post không tồn tại",
      });
    }

    return res.json({
      success: true,
      message: "Đã chia sẻ bài viết",
      data: {
        postId: post._id,
        sharesCount: post.sharesCount,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

async function updateLastAudienceSetting(
  userId,
  visibility,
  allowedUsers = [],
) {
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        lastAudienceSetting: visibility,
        lastSelectedAudience: visibility === "custom" ? allowedUsers : [],
      },
    },
  );
}
