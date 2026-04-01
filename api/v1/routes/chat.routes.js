const express = require("express");
const router = express.Router();

const controller = require("../controllers/chat.controller.js");
const userMiddleware = require("../middlewares/user.middleware.js");

router.get("/", userMiddleware.requireUser, controller.getFriendsChatList);

module.exports = router;
