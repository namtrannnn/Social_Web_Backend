const express = require("express");
const router = express.Router();

const controller = require("../controllers/roomChat.controller");
const userMiddleware = require("../middlewares/user.middleware");

router.post("/create", userMiddleware.requireUser, controller.create);

router.post(
  "/get-or-create-friend",
  userMiddleware.requireUser,
  controller.getOrCreateFriend
);

module.exports = router;
