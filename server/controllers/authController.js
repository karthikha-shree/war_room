const User = require("../models/User");
const Board = require("../models/Board");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");

// REGISTER
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({ name, email, password });

    // Check for board invitations
    const boardsWithInvites = await Board.find({
      "invitedMembers.email": email.toLowerCase()
    });

    // Add user to boards they were invited to
    for (const board of boardsWithInvites) {
      // Find the invitation
      const invitation = board.invitedMembers.find(
        (invite) => invite.email.toLowerCase() === email.toLowerCase()
      );

      if (invitation) {
        // Add user to members with invited role
        board.members.push({
          user: user._id,
          role: invitation.role
        });

        // Remove from invitedMembers
        board.invitedMembers = board.invitedMembers.filter(
          (invite) => invite.email.toLowerCase() !== email.toLowerCase()
        );

        await board.save();
      }
    }

    res.status(201).json({message:"User registered successfully",
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Registration failed", error });
  }
};

// GET CURRENT USER
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      authProvider: user.authProvider,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get user data", error });
  }
};

// UPDATE USER PROFILE
exports.updateUserProfile = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Name is required" });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = name.trim();
    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      _id: user._id,
      name: user.name,
      email: user.email,
      authProvider: user.authProvider,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update profile", error });
  }
};

// LOGIN
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Prevent Google users from logging in with password
    if (user.authProvider === "google") {
      return res.status(400).json({ 
        message: "This account uses Google Sign-In. Please login with Google." 
      });
    }

    // Check if user has a password (should exist for local users)
    if (!user.password) {
      return res.status(400).json({ 
        message: "Password not set for this account. Please use social login." 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({message:"Login successful",
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error });
  }
};



exports.resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Hash token from params
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Set new password (will auto-hash via pre-save)
    user.password = password;

    // Clear reset fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ message: "Password reset successful" });

  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate reset token (raw token to send in email)
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash token before saving to DB
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const message = `
      You requested a password reset.
      Please click the link below to reset your password:
      ${resetUrl}

      This link will expire in 10 minutes.
    `;

    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      text: message,
    });

    res.status(200).json({
      message: "Password reset email sent",
    });

  } catch (error) {
    next(error);
  }
};
