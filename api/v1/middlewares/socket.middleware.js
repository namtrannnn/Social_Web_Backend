const User = require("../models/user.model");

module.exports = () => {
  _io.use(async (socket, next) => {
    try {
      console.log("=== SOCKET MIDDLEWARE ===");
      console.log("auth:", socket.handshake.auth);
      console.log("headers origin:", socket.handshake.headers.origin);

      const tokenUser = socket.handshake.auth?.tokenUser;

      if (!tokenUser) {
        return next(new Error("NO_TOKEN")); // PHẢI next
      }

      const user = await User.findOne({ tokenUser });

      if (!user) {
        return next(new Error("USER_NOT_FOUND")); // PHẢI next
      }

      socket.user = user;
      next(); //
    } catch (err) {
      next(err);
    }
  });
};
