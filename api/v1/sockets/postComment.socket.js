module.exports = (socket) => {
  socket.on("CLIENT_JOIN_POST_COMMENT", (postId) => {
    if (!postId) return;

    const roomName = `post:${postId}`;
    socket.join(roomName);

    console.log(`Socket ${socket.id} joined ${roomName}`);
  });

  socket.on("CLIENT_LEAVE_POST_COMMENT", (postId) => {
    if (!postId) return;

    const roomName = `post:${postId}`;
    socket.leave(roomName);

    console.log(`Socket ${socket.id} left ${roomName}`);
  });
};
