const mongoose = require("mongoose");

const sliderMenuSchema = new mongoose.Schema(
  {
    parent_id: {
      type: String,
      default: "",
    },
    title: String,
    icon: String,
    path: String,
    position: Number,
    visible: {
      type: Boolean,
      default: true,
    },
    badge: Number,
  },
  {
    timestamps: true,
  }
);

const SliderMenu = mongoose.model(
  "slider-menu",
  sliderMenuSchema,
  "slider-menu"
);
module.exports = SliderMenu;
