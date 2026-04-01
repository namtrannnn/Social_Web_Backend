const express = require("express");
const router = express.Router();

const upload = require("../middlewares/upload.middleware");

const controller = require("../controllers/sliderMenu.controller");

router.get("/");
router.post("/create", upload.single("icon"), controller.create);

module.exports = router;
