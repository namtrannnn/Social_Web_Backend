const User = require("./user.route");
const Users = require("./users.route");
const SliderMenu = require("./sliderMenu.routes");
const Account = require("./account.routes");

// [STORY]
const Story = require("./story.routes");

// [POST]
const Post = require("./post.routes");
const PostLike = require("./postLike.routes");
const PostComment = require("./postComment.routes");
const PostSave = require("./postSave.routes");

const Chat = require("./chat.routes");
const RoomChat = require("./roomChat.routes");

module.exports = (app) => {
  const version = "/api/v1";
  app.use(version + "/user", User);
  app.use(version + "/users", Users);
  app.use(version + "/slider-menu", SliderMenu);
  app.use(version + "/account", Account);
  app.use(version + "/story", Story);
  app.use(version + "/post", Post);
  app.use(version + "/post", PostLike);
  app.use(version + "/post/comment", PostComment);
  app.use(version + "/post/save", PostSave);
  app.use(version + "/chat", Chat);
  app.use(version + "/room-chat", RoomChat);
};
