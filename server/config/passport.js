const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
const jwt = require("jsonwebtoken");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        
        // Extract name with fallback strategy
        let userName = profile.displayName;
        if (!userName || userName.trim() === "") {
          // Fallback to given name + family name
          const givenName = profile.name?.givenName || "";
          const familyName = profile.name?.familyName || "";
          userName = `${givenName} ${familyName}`.trim();
          
          // If still empty, use email username as last resort
          if (!userName) {
            userName = email.split("@")[0];
          }
        }
        
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Check if a local user exists with this email
          const existingUser = await User.findOne({ email });
          
          if (existingUser && existingUser.authProvider === "local") {
            // Link Google account to existing local account
            existingUser.googleId = profile.id;
            existingUser.authProvider = "google";
            // Update name if it wasn't set
            if (!existingUser.name || existingUser.name.trim() === "") {
              existingUser.name = userName;
            }
            await existingUser.save();
            user = existingUser;
          } else if (existingUser && existingUser.authProvider === "google") {
            // Google user already exists, update name if empty
            if (!existingUser.name || existingUser.name.trim() === "") {
              existingUser.name = userName;
              await existingUser.save();
            }
            user = existingUser;
          } else {
            // Create new Google user
            user = await User.create({
              name: userName,
              email: email,
              googleId: profile.id,
              authProvider: "google",
            });
          }
        } else {
          // Existing Google user - update name if it's empty
          if (!user.name || user.name.trim() === "") {
            user.name = userName;
            await user.save();
          }
        }

        const token = jwt.sign(
          { id: user._id },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        return done(null, { token });
      } catch (err) {
        done(err, null);
      }
    }
  )
);
