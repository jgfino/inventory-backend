import passport from "passport";
import { Strategy as JWTStrategy, StrategyOptions } from "passport-jwt";
import { ExtractJwt } from "passport-jwt";
import UserModel from "../schema/user.schema";

// Options for jwt verification
const jwtOpts: StrategyOptions = {
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
      const user = await UserModel.findById(payload.user._id).lean();
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

export default passport;
