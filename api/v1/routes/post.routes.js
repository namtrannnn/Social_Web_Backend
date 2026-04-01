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
  controller.create
);

module.exports = router;
