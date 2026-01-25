const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv =  require("dotenv");
dotenv.config();

const boardRoutes = require("./routes/boardRoutes");
const authRoutes = require("./routes/authRoutes");
const app = express();
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  ;
});
