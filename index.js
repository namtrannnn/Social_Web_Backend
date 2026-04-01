const express = require("express");
const db = require("./config/db");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const routerApiVer1 = require("./api/v1/routes/index");

const http = require("http");
const { Server } = require("socket.io");

require("dotenv").config();
db.connect();

const app = express();
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:55321",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5000",
  "http://127.0.0.1:55321",
];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true,
//   }),
// );

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(bodyParser.json());

const port = process.env.PORT;
routerApiVer1(app);

// SOCKET [IO]
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
  path: "/socket.io",
});

global._io = io;

const socketIO = require("./api/v1/sockets/index");
socketIO();
// END SOCKET

server.listen(port, () => {
  console.log(`App listen on port ${port}`);
});
