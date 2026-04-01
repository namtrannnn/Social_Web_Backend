const express = require("express");
const router = express.Router();

const controller = require("../controllers/user.controller");
const userMiddleware = require("../middlewares/user.middleware.js");

router.get("/", controller.index);

router.post("/register", controller.register);
router.post("/login", controller.login);
router.get("/detail", controller.detail);

// [FORGET_PASSWORD]
router.post("/forget-password", controller.forgetPassword);
router.post("/forget-password/otp", controller.otpPassword);
router.post("/forget-password/otp/reset-password", controller.resetPassword);

// search
router.get("/search-user", userMiddleware.requireUser, controller.searchUser);

module.exports = router;
