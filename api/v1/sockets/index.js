const usersSocket = require("./users.socket");
const chatSocket = require("./chat.socket");
const socketMiddleware = require("../middlewares/socket.middleware");

module.exports = () => {
  socketMiddleware();

  module.exports = () => {
    socketMiddleware();

    global._io.on("connection", (socket) => {
      console.log("client connected:", socket.id);

      const userId = socket.user._id.toString();
      socket.join(userId);

      usersSocket(socket);
      chatSocket(socket);
    });
  };

  // global._io.on("connection", (socket) => {
  //   console.log("client connected:", socket.id);

  //   usersSocket(socket);
  //   chatSocket(socket);

  //   socket.on("disconnect", (reason) => {
  //     console.log("client disconnected:", reason);
  //   });
  // });
};
