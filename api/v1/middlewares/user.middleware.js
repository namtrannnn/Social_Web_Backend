const User = require("../models/user.model");

module.exports.requireUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Không có token!" });
    }
    const tokenUser = authHeader.split(" ")[1];
    const user = await User.findOne({
      tokenUser: tokenUser,
      deleted: false,
    }).select("-password");
    req.user = user;
    next();
  } catch (error) {
    res.json({
      code: 400,
      message: "Vui lòng gửi theo đăng nhập",
    });
  }
};
