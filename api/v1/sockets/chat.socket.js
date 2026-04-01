const RoomChat = require("../models/roomChat.model");
const Chat = require("../models/chat.model");

const uploadStreamToCloudinary = require("../../../helpers/cloudinary.helper");

module.exports = (socket) => {
  // CLIENT ADD FRIEND
  const myUserId = socket.user._id.toString();
  socket.on("CLIENT_JOIN_ROOM", (roomId) => {
    console.log("roomId", roomId);
    socket.join(roomId);
    console.log("User", socket.id, "joined room", roomId);
  });

  socket.on("CLIENT_SEND_MESSAGE", async (data) => {
    console.log("data", data);
    const { user_id, roomChatId, content } = data;
    socket.join(roomChatId);
    let images = [];
    if (data.images) {
      images = data.images.map((img) => ({
        url: img.url,
        public_id: img.public_id,
      }));
    }

    console.log(images);
    const chat = new Chat({
      user_id: user_id,
      room_chat_id: roomChatId,
      content: content,
      images: images,
    });
    await chat.save();
    socket.to(roomChatId).emit("SERVER_RETURN_MESSAGE", {
      _id: chat._id,
      user_id: user_id,
      roomChatId: roomChatId,
      content: content,
      images: images,
      createdAt: chat.createdAt,
    });
    // console.log("Đã gửi message tới room:", roomChatId);
  });
};
