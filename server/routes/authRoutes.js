const express = require("express");
const passport = require("passport");
const crypto = require("crypto");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { protect } = require("../middleware/authMiddleware");
const {
  registerUser,
  loginUser,
  getCurrentUser,
  updateUserProfile,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getCurrentUser);
router.put("/profile", protect, updateUserProfile);

// Debug endpoint to check OAuth configuration
router.get("/debug/oauth-config", (req, res) => {
  res.json({
    callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`,
    clientID: process.env.GOOGLE_CLIENT_ID,
    serverURL: process.env.SERVER_URL,
    clientURL: process.env.CLIENT_URL
  });
});

router.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get("/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    try {
      // Validate that user and token exist
      if (!req.user || !req.user.token) {
        return res.redirect(`${process.env.CLIENT_URL}/login?error=authentication_failed`);
      }

      // Validate CLIENT_URL is set
      if (!process.env.CLIENT_URL) {
        console.error("CLIENT_URL not configured");
        return res.status(500).json({ message: "Server configuration error" });
      }

      res.redirect(`${process.env.CLIENT_URL}/oauth-success?token=${req.user.token}`);
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.redirect(`${process.env.CLIENT_URL}/login?error=authentication_failed`);
    }
  }
);

router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;

    // Validate email input
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is a Google user
    if (user.authProvider === "google") {
      return res.status(400).json({ 
        message: "This account uses Google Sign-In. Password reset is not available." 
      });
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash token before saving to database (security best practice)
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set expiration to 10 minutes
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    // Save user with reset token
    await user.save();

    // Create reset URL with raw token (not hashed)
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // Email content
    const message = `You requested a password reset. Please click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.`;
    
    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested a password reset for your War Room account.</p>
        <p>Please click the button below to reset your password:</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #4CAF50; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link in your browser:<br>
          <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p style="color: #999; font-size: 12px;">
          This link will expire in 10 minutes.<br>
          If you did not request this, please ignore this email.
        </p>
      </div>
    `;

    // Send email
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request - War Room",
      text: message,
      html: htmlMessage
    });

    res.status(200).json({ 
      success: true,
      message: "Password reset email sent successfully" 
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    
    // Clear reset token if email fails
    if (req.body.email) {
      const user = await User.findOne({ email: req.body.email });
      if (user) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
      }
    }

    res.status(500).json({ 
      success: false,
      message: "Failed to send password reset email. Please try again later." 
    });
  }
});

router.put("/reset-password/:token", async (req, res, next) => {
  try {
    const { password } = req.body;

    // Validate password input
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Hash the token from URL to match with database
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    // Find user with valid token and not expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: "Invalid or expired reset token. Please request a new password reset." 
      });
    }

    // Set new password (will be hashed by pre-save hook)
    user.password = password;
    
    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    // Save user
    await user.save();

    res.status(200).json({ 
      success: true,
      message: "Password updated successfully. You can now log in with your new password." 
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to reset password. Please try again." 
    });
  }
});

module.exports = router;
