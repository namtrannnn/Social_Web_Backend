const User = require("../models/user.model");
const ForgetPassword = require("../models/forgetPassword.model");
const sendMail = require("../../../helpers/sendMail");
const md5 = require("md5");

module.exports.index = async (req, res) => {
  try {
  } catch (error) {
    res.json(error());
  }
};

// [POST] api/v1/user/register
module.exports.register = async (req, res) => {
  try {
    const email = req.body.email;
    const password = md5(req.body.password);

    const user = await User.findOne({
      email: email,
      deleted: false,
    });
    if (user) {
      res.json({
        code: 400,
        message: "Email này đã tồn tại!",
      });
    } else {
      const newUser = new User({
        ...req.body,
        password: password,
      });
      await newUser.save();
      res.json({
        code: 200,
        message: "Tạo tài khoản thành công!",
        user: newUser,
      });
    }
  } catch (error) {
    res.json({
      code: 400,
      message: error.message,
    });
  }
};

// [POST] api/v1/user/login
module.exports.login = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const user = await User.findOne({
      email: email,
      deleted: false,
    });
    if (!user) {
      res.json({
        code: 400,
        message: "Email này không tồn tại!",
      });
      return;
    }
    if (md5(password) !== user.password) {
      res.json({
        code: 400,
        message: "Mật khẩu không chính xác!",
      });
      return;
    }
    user.password = undefined;
    res.json({
      code: 200,
      message: "Đăng nhập thành công!",
      tokenUser: user.tokenUser,
      user: user,
    });
  } catch (error) {
    res.json({
      code: 400,
      message: error.message,
    });
  }
};

// [GET] api/v1/user/detail == unfinished ==
module.exports.detail = async (req, res) => {
  const id = req.body.user_id;
  const user = await User.findOne({
    _id: id,
  });
  res.json(user);
};

// [POST] api/v1/user/forgetPassword
module.exports.forgetPassword = async (req, res) => {
  try {
    const email = req.body.email;
    const user = await User.findOne({
      email: email,
      deleted: false,
    });
    if (!user) {
      res.json({
        code: 400,
        message: "Email này không tồn tại!",
      });
      return;
    }
    const otp = new ForgetPassword({ email });
    await otp.save();
    const subject = "Mã OTP để lấy lại mật khẩu.";
    const html = `
      Mã OTP để lấy lại mật khẩu là ${otp.otp}. Mã sẽ hết hạn sau 3 phút nữa!
    `;
    sendMail.sendMail(email, subject, html);
    res.json({
      code: 200,
      message: `Đã gửi mã OTP đến ${email}`,
    });
  } catch (error) {
    res.json({
      code: 400,
      message: error.message,
    });
  }
};

// [POST] api/v1/user/otpPassword
module.exports.otpPassword = async (req, res) => {
  try {
    const email = req.body.email;
    const otp = req.body.otp;
    const result = await ForgetPassword.findOne({
      email: email,
      otp: otp,
    });
    if (!result) {
      res.json({
        code: 400,
        message: "Mã OTP không hợp lệ!",
      });
      return;
    }
    const user = await User.findOne({
      email: email,
    });
    res.json({
      code: 200,
      message: "Xác thực thành công!",
      tokenUser: user.tokenUser,
    });
  } catch (error) {
    res.json({
      code: 400,
      message: error.message,
    });
  }
};

// [POST] api/v1/user/resetPassword
module.exports.resetPassword = async (req, res) => {
  try {
    const tokenUser = req.body.tokenUser;
    const password = req.body.password;
    const user = await User.findOne({
      tokenUser: tokenUser,
    });
    if (user.password === md5(password)) {
      res.json({
        code: 400,
        message: "Không được đặt mật khẩu trùng với mật khẩu cũ",
      });
      return;
    }
    console.log(user);
    await User.updateOne(
      {
        tokenUser: tokenUser,
      },
      {
        password: md5(password),
      }
    );
    res.json({
      code: 200,
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    res.json({
      code: 400,
      message: error.message,
    });
  }
};

// [GET] api/v1/user/searchUser
module.exports.searchUser = async (req, res) => {
  try {
    const keyword = req.query.keyword?.trim() || "";

    let user = await User.findById(req.user._id)
      .populate({
        path: "friendList.user_id",
        match: keyword
          ? {
              fullName: { $regex: keyword, $options: "i" },
              deleted: false,
            }
          : { deleted: false },
        select: "_id avatar fullName",
      })
      .lean();

    const friends = user.friendList
      .filter((f) => f.user_id !== null)
      .map((f) => ({
        roomChatId: f.room_chat_id,
        user: f.user_id,
      }));

    res.json({
      code: 200,
      friends,
    });
  } catch (error) {
    res.json({
      code: 400,
      message: error.message,
    });
  }
};
