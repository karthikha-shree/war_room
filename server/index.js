const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const dotenv =  require("dotenv");
dotenv.config();
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Board = require("./models/Board");
const ChatMessage = require("./models/ChatMessage");
const { isBoardMember } = require("./utils/boardPermissions");
const {initSocket} = require("./socket");
const app = express();
const server = http.createServer(app);
const io = initSocket(server);
const PORT = process.env.PORT || 5000;

const boardRoutes = require("./routes/boardRoutes");
const authRoutes = require("./routes/authRoutes");


const passport = require("passport");
require("./config/passport");

app.use(passport.initialize());

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Adjust for your needs
  crossOriginEmbedderPolicy: false
}));

app.use(cors());
app.use(express.json());

app.use("/api/boards", boardRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("War-Room Backend Running");
});


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: "*",
//   },
// });

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return next(new Error("User not found"));

    socket.user = user;
    next();
  } catch (err) {
    next(new Error("Auth failed"));
  }
});
io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.user._id.toString());

  socket.on("joinBoard", async ({ boardId }) => {
    const board = await Board.findById(boardId);
    if (!board) return;

    if (!isBoardMember(board, socket.user._id)) return;

    socket.join(boardId);
    socket.emit("joinedBoard", boardId);
  });

  socket.on("sendMessage", async ({ boardId, text }) => {
  try {
    if (!text?.trim()) return;

    const board = await Board.findById(boardId);
    if (!board) return;

    if (!isBoardMember(board, socket.user._id)) return;

    const message = await ChatMessage.create({
      board: boardId,
      user: socket.user._id,
      text,
    });

    const populated = await message.populate("user", "name email");
    io.to(boardId).emit("newMessage", populated);
  } catch (err) {
    console.error("Socket sendMessage error:", err);
  }
});

socket.on("disconnect", () => {
  console.log("🔴 Disconnected:", socket.user._id.toString());
});

});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


