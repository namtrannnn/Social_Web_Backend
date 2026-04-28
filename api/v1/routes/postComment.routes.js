const express = require("express");
const router = express.Router();

const userMiddleware = require("../middlewares/user.middleware");
const postCommentController = require("../controllers/postComment.controller");

// CREATE COMMENT
router.post(
  "/:postId",
  userMiddleware.requireUser,
  postCommentController.createComment,
);

// GET COMMENTS BY POST
router.get(
  "/:postId",
  userMiddleware.requireUser,
  postCommentController.getCommentsByPost,
);

// HIDE COMMENT
router.patch(
  "/hide/:commentId",
  userMiddleware.requireUser,
  postCommentController.hideComment,
);

// EDIT COMMENT
router.patch(
  "/edit/:commentId",
  userMiddleware.requireUser,
  postCommentController.editComment,
);

// DELETE COMMENT (PENDING DELETE)
router.patch(
  "/delete/:commentId",
  userMiddleware.requireUser,
  postCommentController.deleteComment,
);

// UNDO DELETE COMMENT
router.patch(
  "/undo-delete/:commentId",
  userMiddleware.requireUser,
  postCommentController.undoDeleteComment,
);

// GET EDIT HISTORY
router.get(
  "/history/:commentId",
  userMiddleware.requireUser,
  postCommentController.getCommentEditHistory,
);

module.exports = router;
