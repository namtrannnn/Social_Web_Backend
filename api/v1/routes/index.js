const User = require("./user.route");
const Users = require("./users.route");
const SliderMenu = require("./sliderMenu.routes");
const Account = require("./account.routes");
const Post = require("./post.routes");
const Chat = require("./chat.routes");
const RoomChat = require("./roomChat.routes");

module.exports = (app) => {
  const version = "/api/v1";
  app.use(version + "/user", User);
  app.use(version + "/users", Users);
  app.use(version + "/slider-menu", SliderMenu);
  app.use(version + "/account", Account);
  app.use(version + "/post", Post);
  app.use(version + "/chat", Chat);
  app.use(version + "/room-chat", RoomChat);
};
