const express = require("express");
const router = express.Router();

const userMiddleware = require("../middlewares/user.middleware.js");
const controller = require("../controllers/postLike.controller.js");

// LIKE / UNLIKE
router.post(
  "/toggle-like/:postId",
  userMiddleware.requireUser,
  controller.toggleLike,
);

// LẤY DANH SÁCH NGƯỜI LIKE
router.get(
  "/likes/:postId",
  userMiddleware.requireUser,
  controller.getUsersLikedPost,
);

module.exports = router;
