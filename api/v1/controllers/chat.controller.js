const Chat = require("../models/chat.model");
const RoomChat = require("../models/roomChat.model");
const User = require("../models/user.model");

// [GET] api/v1/chat/index
module.exports.index = async (req, res) => {
  try {
    const userId = req.user._id;
    const listChat = await RoomChat.find({
      "users.user_id": userId,
      deleted: false,
    });
    const listChatId = listChat.map((e) => e._id);
    const chats = await Chat.find({
      room_chat_id: { $in: listChatId },
    });
    for (const chat of chats) {
      const userInfo = await User.findOne({
        _id: chat.user_id,
      }).select("fullName");
      chat.userInfo = userInfo;
      console.log(userInfo);
    }
    res.status(200).json(chats);
    // console.log("userId", userId);
  } catch (error) {
    res.status(400).json({
      message: "Failed!",
    });
  }
};

// [GET] api/v1/chat/friends
module.exports.getFriendsChatList = async (req, res) => {
  try {
    const userId = req.user._id;

    const privateRooms = await RoomChat.find({
      "users.user_id": userId,
      deleted: false,
    });

    const results = [];

    for (const room of privateRooms) {
      const members = [];
      for (const u of room.users) {
        const userInfo = await User.findById(u.user_id).select(
          "id fullName avatar"
        );
        if (userInfo) {
          members.push({
            ...u.toObject(), // giữ role, user_id
            user: userInfo,
          });
        }
      }

      const allMessages = await Chat.find({
        room_chat_id: room._id,
        deleted: false,
      });

      results.push({
        roomId: room._id,
        members, // đầy đủ tất cả member
        typeRoom: room.typeRoom,
        messages: allMessages,
      });
    }

    res.status(200).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "FAILED!" });
  }
};
