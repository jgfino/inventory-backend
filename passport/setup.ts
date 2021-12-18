/**
 * Defines authorization methods with passportjs.
 */

import UserModel from "../schema/user.schema";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JWTStrategy } from "passport-jwt";
import { ExtractJwt } from "passport-jwt";

/**
 * Defines a local login strategy. This method attempts to log in a user with
 * an email and password.
 */
passport.use(
  "local",
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      const user = await UserModel.findOne({ email: email });

      console.log(password);

      if (!user) {
        return done(null, false, {
          message: "No user registered with this email address.",
        });
      }

      const passwordMatch = user.validatePassword(password);

      if (!passwordMatch) {
        return done(null, false, { message: "Incorrect password." });
      } else {
        return done(null, user, { message: "User signed in successfully" });
      }
    }
  )
);

// Options for jwt verification
const jwtOpts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

/**
 * Defines a jwt strategy for verifying tokens.
 */
passport.use(
  "jwt",
  new JWTStrategy(jwtOpts, async (payload, done) => {
    try {
      console.log(payload);
      return done(null, payload.user);
    } catch (err) {
      return done(err);
    }
  })
);

export default passport;
