const User = require("../models/user.model");
// const socketUser = require("../sockets/users.socket");

// [GET] api/v1/users/not-friend
module.exports.not_friend = async (req, res) => {
  try {
    // socketUser();
    const user = req.user;
    const requestFriends = user.requestFriends;
    const acceptFriends = user.acceptFriends;
    const friendList = user.friendList;
    const friendListId = friendList.map((i) => i.user_id);
    // console.log("user: ", user);
    const users = await User.find({
      $and: [
        { _id: { $ne: user._id } },
        { _id: { $nin: requestFriends } },
        { _id: { $nin: acceptFriends } },
        { _id: { $nin: friendListId } },
      ],
      status: "active",
      deleted: false,
    });

    res.json(users);
  } catch (error) {
    res.json({
      code: 400,
      message: "Failed!",
    });
  }
};

// [GET] api/v1/users/requests
module.exports.request = async (req, res) => {
  try {
    const userId = req.user;
    // console.log("request", userId);
    const myUser = await User.findOne({
      _id: userId,
    });
    const requestFriends = myUser.requestFriends;
    const user = await User.find({
      _id: { $in: requestFriends },
      status: "active",
      deleted: false,
    }).select("id fullName avatar");
    res.json(user);
  } catch (error) {
    res.json({
      code: 400,
      message: "Failed!",
    });
  }
};

// [GET] api/v1/users/accept
module.exports.accept = async (req, res) => {
  try {
    const userId = req.user;
    const myUser = await User.findOne({
      _id: userId,
    });
    const acceptFriends = myUser.acceptFriends;
    // const acceptFriendsLength = acceptFriends.length;
    // console.log(acceptFriendsLength);
    const user = await User.find({
      _id: { $in: acceptFriends },
      status: "active",
      deleted: false,
    }).select("id avatar fullName");
    // console.log(user);
    res.json(user);
  } catch (error) {
    res.json({
      code: 400,
      message: "Failed!",
    });
  }
};

// [GET] api/v1/users/friends
module.exports.friends = async (req, res) => {
  try {
    const userId = req.user._id;
    const myUser = await User.findOne({
      _id: userId,
    });
    const friendList = myUser.friendList;
    const friendListId = friendList.map((i) => i.user_id);
    const users = await User.find({
      _id: { $in: friendListId },
      status: "active",
      deleted: false,
    }).select("id fullName avatar");

    //  for (const user of users) {
    //     const infoFriend = friendList.find(friend => friend.user_id == user.id);
    //     user.infoFriend = infoFriend;
    // }

    res.json(users);
  } catch (error) {
    res.json({
      code: 400,
      message: "Failed!",
    });
  }
};
