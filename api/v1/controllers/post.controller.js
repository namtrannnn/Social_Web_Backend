const Post = require("../models/post.model");
const User = require("../models/user.model");
const uploadStreamToCloudinary = require("../../../helpers/cloudinary.helper");
// [GET] api/v1/post/
module.exports.index = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("friendList");
    const friends = user.friendList.map((f) => f.user_id);
    console.log(friends);
    const posts = await Post.find({
      $or: [
        { privacy: { $eq: "public" } },
        {
          "postedBy.user_id": { $in: [...friends, userId] },
          privacy: { $ne: "private" },
        },
        { privacy: "private", "postedBy.user_id": userId },
      ],
    });
    res.json({
      posts,
    });
  } catch (error) {
    res.json({
      code: 400,
      message: "Failed!",
    });
  }
};

// [POST] api/v1/post/create
module.exports.create = async (req, res) => {
  try {
    const files = req.files;
    const uploadedImages = await Promise.all(
      files.map((file) => uploadStreamToCloudinary(file.buffer, "/posts"))
    );
    const user = req.user;
    const postedBy = {
      avatar: user.avatar,
      user_id: user._id,
      name: user.fullName,
      email: user.email,
    };
    const post = new Post({
      ...req.body,
      images: uploadedImages.map((image) => ({
        url: image.url,
        public_id: image.public_id,
      })),
      postedBy,
    });
    await post.save();
    res.status(200).json({
      message: "Tạo bài viết thành công",
      post: post,
    });
  } catch (error) {
    res.json({
      code: 400,
      message: "Failed!",
    });
  }
};
