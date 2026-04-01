const RoomChat = require("../models/roomChat.model");

// GET api/v1/

// [POST] api/v1/room-chat/create
module.exports.create = async (req, res) => {
  try {
    const { title, usersId } = req.body;
    // console.log("req.chat", req.body);
    const userId = req.user._id;
    const dataRoom = {
      title: title,
      typeRoom: "group",
      users: [],
    };
    for (const userId of usersId) {
      dataRoom.users.push({
        user_id: userId,
        role: "member",
      });
    }
    dataRoom.users.push({
      user_id: userId,
      role: "superAdmin",
    });

    const roomChat = new RoomChat(dataRoom);
    await roomChat.save();
    res.status(201).json({
      message: "Room created successfully",
      _id: roomChat._id,
      // members: roomChat.users,
      // typeRoom: roomChat.typeRoom,
    });
  } catch (error) {
    res.json(400).json({ message: "FAILED!" });
  }
};

// [POST] api/v1/room-chat/get-or-create-friend
module.exports.getOrCreateFriend = async (req, res) => {
  try {
    const meId = req.user._id;
    const { userId } = req.body; // id người nhận
    console.log("userIDDDD", userId);
    if (!userId) {
      return res.status(400).json({ message: "Missing userId" });
    }
    if (meId.toString() === userId.toString()) {
      return res.status(400).json({ message: "Cannot chat with yourself" });
    }

    // 1) tìm room friend có đúng 2 người (me + userId)
    let room = await RoomChat.findOne({
      typeRoom: "friend",
      "users.user_id": { $all: [meId, userId] },
      $expr: { $eq: [{ $size: "$users" }, 2] },
    });

    // 2) chưa có -> tạo mới
    if (!room) {
      room = new RoomChat({
        title: "",
        typeRoom: "friend",
        users: [
          { user_id: meId, role: "member" },
          { user_id: userId, role: "member" },
        ],
      });
      await room.save();
    }

    return res.status(200).json({
      message: "OK",
      _id: room._id,
      room,
    });
  } catch (error) {
    console.log("getOrCreateFriend error:", error);
    return res.status(500).json({ message: "FAILED!" });
  }
};
