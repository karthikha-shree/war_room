const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      minlength: 6,
    },

    googleId: {
      type: String,
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);
const bcrypt = require("bcryptjs");
userSchema.pre("save", async function () {
  if (!this.password || !this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});


module.exports = mongoose.model("User", userSchema);
