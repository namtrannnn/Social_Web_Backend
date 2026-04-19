const usersSocket = require("./users.socket");
const chatSocket = require("./chat.socket");
const postCommentSocket = require("./postComment.socket");
const socketMiddleware = require("../middlewares/socket.middleware");

module.exports = () => {
  socketMiddleware();

  global._io.on("connection", (socket) => {
    console.log("client connected:", socket.id);

    const userId = socket.user._id.toString();
    socket.join(userId);

    usersSocket(socket);
    chatSocket(socket);
    postCommentSocket(socket);

    socket.on("disconnect", (reason) => {
      console.log("client disconnected:", socket.id, reason);
    });
  });
};
