const express = require("express");
const router = express.Router();

const userMiddleware = require("../middlewares/user.middleware");
const postSaveController = require("../controllers/postSave.controller");

// OVERVIEW
router.get(
  "/overview",
  userMiddleware.requireUser,
  postSaveController.getSavedOverview,
);
// TOGGLE SAVE (save / unsave)
router.post(
  "/toggle/:postId",
  userMiddleware.requireUser,
  postSaveController.toggleSavePost,
);

// GET ALL SAVED POSTS (không collection)
router.get(
  "/all",
  userMiddleware.requireUser,
  postSaveController.getAllSavedPosts,
);

// GET POSTS BY COLLECTION
router.get(
  "/collection/:collectionId",
  userMiddleware.requireUser,
  postSaveController.getPostsByCollection,
);

// CREATE COLLECTION
router.post(
  "/collection",
  userMiddleware.requireUser,
  postSaveController.createCollection,
);

// GET MY COLLECTIONS
router.get(
  "/collections",
  userMiddleware.requireUser,
  postSaveController.getMyCollections,
);

// DELETE COLLECTION
router.delete(
  "/collection/:collectionId",
  userMiddleware.requireUser,
  postSaveController.deleteCollection,
);

// MOVE POST TO COLLECTION
router.patch(
  "/move/:postId",
  userMiddleware.requireUser,
  postSaveController.movePostToCollection,
);

module.exports = router;
