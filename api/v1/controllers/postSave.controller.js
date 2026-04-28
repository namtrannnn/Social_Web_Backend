const PostSave = require("../models/postsave.model");
const Post = require("../models/post.model");
const Collection = require("../models/collection.model");

exports.getSavedOverview = async (req, res) => {
  try {
    const userId = req.user.id;

    // Lấy 4 ảnh preview cho All posts
    const allSaves = await PostSave.find({ user: userId })
      .populate("post", "media")
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();

    const allCount = await PostSave.countDocuments({ user: userId });

    const allPreviewImages = allSaves
      .map((item) => item.post?.media?.[0]?.url)
      .filter(Boolean);

    // Lấy collections của user
    const collections = await Collection.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();

    // Với mỗi collection, lấy 4 ảnh preview + count
    const collectionItems = await Promise.all(
      collections.map(async (collection) => {
        const saves = await PostSave.find({
          user: userId,
          collection: collection._id,
        })
          .populate("post", "media")
          .sort({ createdAt: -1 })
          .limit(4)
          .lean();

        const count = await PostSave.countDocuments({
          user: userId,
          collection: collection._id,
        });

        const previewImages = saves
          .map((item) => item.post?.media?.[0]?.url)
          .filter(Boolean);

        return {
          _id: collection._id,
          name: collection.name,
          type: "collection",
          previewImages,
          count,
        };
      }),
    );

    return res.json({
      success: true,
      data: [
        {
          _id: null,
          name: "All posts",
          type: "all",
          previewImages: allPreviewImages,
          count: allCount,
        },
        ...collectionItems,
      ],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.toggleSavePost = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;
    const collectionId = req.body?.collectionId || null;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post không tồn tại",
      });
    }

    if (collectionId) {
      const collection = await Collection.findOne({
        _id: collectionId,
        user: userId,
      });

      if (!collection) {
        return res.status(404).json({
          success: false,
          message: "Collection không tồn tại",
        });
      }
    }

    const existing = await PostSave.findOne({
      post: postId,
      user: userId,
    });

    if (existing) {
      await existing.deleteOne();

      await Post.findByIdAndUpdate(postId, {
        $inc: { savesCount: -1 },
      });

      return res.json({
        success: true,
        message: "Đã bỏ lưu bài viết",
      });
    }

    await PostSave.create({
      post: postId,
      user: userId,
      collection: collectionId,
    });

    await Post.findByIdAndUpdate(postId, {
      $inc: { savesCount: 1 },
    });

    return res.json({
      success: true,
      message: "Đã lưu bài viết",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getPostsByCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { collectionId } = req.params;
    const collection = await Collection.findOne({
      _id: collectionId,
      user: userId,
    });

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: "Collection không tồn tại",
      });
    }
    const saves = await PostSave.find({
      user: userId,
      collection: collectionId,
    })
      .populate({
        path: "post",
        populate: {
          path: "author",
          select: "username avatar",
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    // lấy ra post thôi
    const posts = saves.map((item) => item.post);

    return res.json({
      success: true,
      data: {
        collection: {
          _id: collection._id,
          name: collection.name,
        },
        posts: posts,
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

exports.getAllSavedPosts = async (req, res) => {
  try {
    const userId = req.user.id;

    const saves = await PostSave.find({
      user: userId,
    })
      .populate({
        path: "post",
        populate: {
          path: "author",
          select: "username avatar",
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    const posts = saves.map((item) => item.post);

    return res.json({
      success: true,
      data: {
        collection: {
          _id: null,
          name: "All posts",
        },
        posts,
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

exports.getMyCollections = async (req, res) => {
  try {
    const userId = req.user.id;

    const collections = await Collection.find({ user: userId })
      .sort({
        createdAt: -1,
      })
      .lean();

    return res.json({
      success: true,
      data: collections,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.createCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    const collection = await Collection.create({
      name,
      user: userId,
    });

    return res.json({
      success: true,
      data: collection,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.deleteCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { collectionId } = req.params;

    const collection = await Collection.findOneAndDelete({
      _id: collectionId,
      user: userId,
    });

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: "Collection không tồn tại",
      });
    }

    // ❗ xóa luôn các save liên quan
    await PostSave.deleteMany({
      user: userId,
      collection: collectionId,
    });

    return res.json({
      success: true,
      message: "Đã xóa collection",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.movePostToCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;
    const { newCollectionId } = req.body;

    const { oldCollectionId } = req.body;

    const save = await PostSave.findOne({
      user: userId,
      post: postId,
      collection: oldCollectionId,
    });

    if (!save) {
      return res.status(404).json({
        success: false,
        message: "Post chưa được lưu",
      });
    }
    if (newCollectionId) {
      const collection = await Collection.findOne({
        _id: newCollectionId,
        user: userId,
      });

      if (!collection) {
        return res.status(404).json({
          success: false,
          message: "Collection mới không tồn tại",
        });
      }
    }
    save.collection = newCollectionId;
    await save.save();

    return res.json({
      success: true,
      message: "Đã chuyển collection",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
