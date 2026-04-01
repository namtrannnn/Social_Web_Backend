const SliderMenu = require("../models/sliderMenu.model");
const uploadStreamToCloudinary = require("../../../helpers/cloudinary.helper");

// [GET] slider-menu/index
module.exports.index = async (req, res) => {
  try {
  } catch (error) {
    res.json({
      code: 400,
      message: "failed!",
    });
  }
};

// [POST] slider-menu/create
module.exports.create = async (req, res) => {
  try {
    const countMenu = await SliderMenu.countDocuments();
    if (!req.body.position) {
      req.body.position = countMenu + 1;
    }

    if (req.file?.buffer) {
      req.body.icon = await uploadStreamToCloudinary(
        req.file.buffer,
        "/sidebar-icons"
      );
    }

    const sliderMenu = new SliderMenu(req.body);
    await sliderMenu.save();
    res.json({
      code: 200,
      message: "Success",
    });
  } catch (error) {
    res.json({
      code: 400,
      message: "failed!",
    });
  }
};
