const User = require("../models/user.model");
const RoomChat = require("../models/roomChat.model");

module.exports = (socket) => {
  const myUserId = socket.user._id.toString();

  // CLIENT ADD FRIEND
  socket.on("CLIENT_ADD_FRIEND", async (userId) => {
    try {
      userId = userId.toString();
      console.log("CLIENT_ADD_FRIEND:", userId);

      // Add id of A to acceptFriends of B
      const existIdAInB = await User.findOne({
        _id: userId,
        acceptFriends: myUserId,
      });

      if (!existIdAInB) {
        await User.updateOne(
          { _id: userId },
          { $push: { acceptFriends: myUserId } },
        );
      }

      // Add id of B to requestFriends of A
      const existIdBInA = await User.findOne({
        _id: myUserId,
        requestFriends: userId,
      });

      if (!existIdBInA) {
        await User.updateOne(
          { _id: myUserId },
          { $push: { requestFriends: userId } },
        );
      }

      // Get updated acceptFriends length of B and send only to B
      const infoUserB = await User.findOne({ _id: userId });
      const lengthAcceptFriends = infoUserB?.acceptFriends?.length || 0;

      global._io.to(userId).emit("SERVER_RETURN_LENGTH_ACCEPT_FRIENDS", {
        userId: userId,
        lengthAcceptFriends: lengthAcceptFriends,
      });

      // Get info of A and send only to B
      const infoUserA = await User.findOne({ _id: myUserId }).select(
        "_id fullName avatar",
      );

      global._io.to(userId).emit("SERVER_RETURN_INFO_ACCEPT_FRIENDS", {
        userId: userId,
        infoUserA: infoUserA,
      });
    } catch (error) {
      console.log("CLIENT_ADD_FRIEND error:", error);
    }
  });

  // CLIENT CANCEL FRIEND
  socket.on("CLIENT_CANCEL_FRIEND", async (userId) => {
    try {
      userId = userId.toString();
      console.log("CLIENT_CANCEL_FRIEND:", userId);

      const existIdAInB = await User.findOne({
        _id: userId,
        acceptFriends: myUserId,
      });

      if (existIdAInB) {
        await User.updateOne(
          { _id: userId },
          { $pull: { acceptFriends: myUserId } },
        );
      }

      const existIdBInA = await User.findOne({
        _id: myUserId,
        requestFriends: userId,
      });

      if (existIdBInA) {
        await User.updateOne(
          { _id: myUserId },
          { $pull: { requestFriends: userId } },
        );
      }

      // Get updated acceptFriends length of B and send only to B
      const infoUserB = await User.findOne({ _id: userId });
      const lengthAcceptFriends = infoUserB?.acceptFriends?.length || 0;

      global._io.to(userId).emit("SERVER_RETURN_LENGTH_ACCEPT_FRIENDS", {
        userId: userId,
        lengthAcceptFriends: lengthAcceptFriends,
      });
    } catch (error) {
      console.log("CLIENT_CANCEL_FRIEND error:", error);
    }
  });

  // CLIENT REFUSE FRIEND
  socket.on("CLIENT_REFUSE_FRIEND", async (userId) => {
    try {
      userId = userId.toString();
      console.log("CLIENT_REFUSE_FRIEND:", userId);

      const existIdAInB = await User.findOne({
        _id: myUserId,
        acceptFriends: userId,
      });

      if (existIdAInB) {
        await User.updateOne(
          { _id: myUserId },
          { $pull: { acceptFriends: userId } },
        );
      }

      const existIdBInA = await User.findOne({
        _id: userId,
        requestFriends: myUserId,
      });

      if (existIdBInA) {
        await User.updateOne(
          { _id: userId },
          { $pull: { requestFriends: myUserId } },
        );
      }

      // Optional: cập nhật lại số lượng request cho chính mình
      const myInfo = await User.findOne({ _id: myUserId });
      const lengthAcceptFriends = myInfo?.acceptFriends?.length || 0;

      global._io.to(myUserId).emit("SERVER_RETURN_LENGTH_ACCEPT_FRIENDS", {
        userId: myUserId,
        lengthAcceptFriends: lengthAcceptFriends,
      });
    } catch (error) {
      console.log("CLIENT_REFUSE_FRIEND error:", error);
    }
  });

  // CLIENT ACCEPT FRIEND
  socket.on("CLIENT_ACCEPT_FRIEND", async (userId) => {
    try {
      userId = userId.toString();
      console.log("CLIENT_ACCEPT_FRIEND:", userId);
      console.log("myUserId:", myUserId);

      const existIdAInB = await User.findOne({
        _id: myUserId,
        acceptFriends: userId,
      });

      const existIdBInA = await User.findOne({
        _id: userId,
        requestFriends: myUserId,
      });

      console.log("existIdAInB:", !!existIdAInB);
      console.log("existIdBInA:", !!existIdBInA);

      if (existIdAInB && existIdBInA) {
        // Tạo phòng chat chung
        const dataRoom = {
          typeRoom: "friend",
          users: [
            {
              user_id: userId,
              role: "superAdmin",
            },
            {
              user_id: myUserId,
              role: "superAdmin",
            },
          ],
        };

        const roomChat = new RoomChat(dataRoom);
        await roomChat.save();

        // Cập nhật friendList cho user hiện tại
        await User.updateOne(
          { _id: myUserId },
          {
            $push: {
              friendList: {
                user_id: userId,
                room_chat_id: roomChat._id,
              },
            },
            $pull: {
              acceptFriends: userId,
            },
          },
        );

        // Cập nhật friendList cho user còn lại
        await User.updateOne(
          { _id: userId },
          {
            $push: {
              friendList: {
                user_id: myUserId,
                room_chat_id: roomChat._id,
              },
            },
            $pull: {
              requestFriends: myUserId,
            },
          },
        );

        // Có thể emit realtime cho 2 bên nếu cần
        global._io.to(myUserId).emit("SERVER_ACCEPT_FRIEND_SUCCESS", {
          userId: userId,
          roomChatId: roomChat._id,
        });

        global._io.to(userId).emit("SERVER_ACCEPT_FRIEND_SUCCESS", {
          userId: myUserId,
          roomChatId: roomChat._id,
        });
      }
    } catch (error) {
      console.log("CLIENT_ACCEPT_FRIEND error:", error);
    }
  });
};
