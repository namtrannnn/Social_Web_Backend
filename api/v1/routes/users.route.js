const express = require("express");
const router = express.Router();

const controller = require("../controllers/users.controller");
const userMiddleware = require("../middlewares/user.middleware.js");

router.get("/not-friend", userMiddleware.requireUser, controller.not_friend);

router.get("/accept", userMiddleware.requireUser, controller.accept);

router.get("/friends", userMiddleware.requireUser, controller.friends);

router.get("/request", userMiddleware.requireUser, controller.request);

module.exports = router;
