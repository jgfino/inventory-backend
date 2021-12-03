/**
 * Defines authorization methods with passportjs.
 */

const bcrypt = require("bcryptjs");
const models = require("../schema");
const User = models.users;
const passport = require("passport");
const LocalStrategy = require("passport-local");
const JWTStrategy = require("passport-jwt").Strategy;
const ExtractJWT = require("passport-jwt").ExtractJwt;
const { ExtractJwt } = require("passport-jwt");

/**
 * Defines a local login strategy. This method attempts to log in a user with
 * an email and password.
 */
passport.use(
  "local-login",
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      const user = await User.findOne({ email: email });

      if (!user) {
        return done(null, false, {
          message: "No user registered with this email address.",
        });
      }

      const passwordMatch = bcrypt.compareSync(
        password,
        user.encrypted_password
      );

      if (!passwordMatch) {
        return done(null, false, { message: "Incorrect password." });
      } else {
        return done(null, user, { message: "User signed in successfully" });
      }
    }
  )
);

/**
 * Defines a local register strategy. This method attempts to register a new
 * user with an email and password.
 */
passport.use(
  "local-register",
  new LocalStrategy(
    {
      usernameField: "email",
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      if (!req.body?.name) {
        return done(null, false, {
          message: "Name for user must be provided",
        });
      }
      try {
        const hash = bcrypt.hashSync(password, 10);
        const user = await User.create({
          name: req.body.name,
          email: email,
          encrypted_password: hash,
        });
        return done(null, user);
      } catch (err) {
        return done(err);
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
      return done(null, payload.user);
    } catch (err) {
      return done(err);
    }
  })
);

module.exports = passport;
