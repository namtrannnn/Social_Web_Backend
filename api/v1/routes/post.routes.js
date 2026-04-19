const express = require("express");
const router = express.Router();

const userMiddleware = require("../middlewares/user.middleware.js");

const upload = require("../middlewares/upload.middleware");
const controller = require("../controllers/post.controller.js");

router.get("/", userMiddleware.requireUser, controller.index);

router.post(
  "/create",
  userMiddleware.requireUser,
  upload.array("images", 20),
  controller.createPost,
);

router.patch("/edit/:id", userMiddleware.requireUser, controller.editPost);

router.get("/feed", userMiddleware.requireUser, controller.getFeedPosts);

router.get("/:id", userMiddleware.requireUser, controller.detailPost);

router.patch("/delete/:id", userMiddleware.requireUser, controller.deletePost);

router.get(
  "/user/:userId",
  userMiddleware.requireUser,
  controller.getPostsByUser,
);

router.get("/me", userMiddleware.requireUser, controller.getMyPosts);

router.get(
  "/related/:id",
  userMiddleware.requireUser,
  controller.getRelatedPosts,
);

router.post("/pin/:id", userMiddleware.requireUser, controller.pinPost);

router.delete("/pin/:id", userMiddleware.requireUser, controller.unpinPost);

module.exports = router;
