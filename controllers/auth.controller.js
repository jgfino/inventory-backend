/**
 * Defines auth operations
 */

const passport = require("passport");
const jwt = require("jsonwebtoken");
const User = require("../schema/user.schema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const db = require("../schema");
const Location = require("../schema/location.schema");

/**
 * Authenticates a user with an email and password. If successful, returns a
 * JWT access token for the client to use in API calls.
 * @param {*} req The request object.
 * @param {*} res The response object.
 * @param {*} next The next action to perform.
 */
exports.login = (req, res, next) => {
  passport.authenticate(
    "local-login",
    { session: false },
    (err, user, info) => {
      if (err) {
        return res.status(400).send({ message: err.message });
      }

      if (!user) {
        return res.status(404).send(info);
      }

      req.login(user, { session: false }, (err) => {
        if (err) {
          return res.status(400).send({ message: err.message });
        }

        const body = { id: user.id };
        const token = jwt.sign({ user: body }, process.env.JWT_SECRET);

        return res.json({
          token: token,
          user: user,
          message: `User with id=${user.id} signed in successfully`,
        });
      });
    }
  )(req, res, next);
};

/**
 * Registers a new user with an email and password and logs them in. On success,
 * returns a JWT token that the client can use in API calls.
 * @param {*} req The request object.
 * @param {*} res The response object.
 * @param {*} next The next action to perform.
 */
exports.register = (req, res, next) => {
  passport.authenticate(
    "local-register",
    { session: false },
    (err, user, info) => {
      if (err) {
        return res.status(400).send({ message: err.message });
      }

      if (!user) {
        return res.status(404).send(info);
      }

      return res.json({
        user: user,
      });
    }
  )(req, res, next);
};

/**
 * Resets the password for the user with the given email using a password reset
 * token.
 * @param {*} req The request object.
 * @param {*} res The response object.
 * @returns A status message.
 */
exports.resetPassword = async (req, res) => {
  if (!req.body) {
    return res.status(400).send({ message: "Request cannot be empty." });
  }

  const email = req.params.email;
  const resetToken = req.query.token;

  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    if (!user.password_reset_token) {
      return res
        .status(400)
        .send({ message: "No password reset token found for this user." });
    }

    if (!bcrypt.compareSync(resetToken, user.password_reset_token)) {
      return res.status(400).send({ message: "Invalid password reset token." });
    }

    if (user.password_reset_expiry.getTime() < new Date().getTime()) {
      return res
        .status(400)
        .send({ message: "Password reset token has expired." });
    }

    const hash = bcrypt.hashSync(req.body.password, 10);
    const updatedUser = await User.findOneAndUpdate(
      { email: email },
      {
        password_reset_token: null,
        password_reset_expiry: null,
        encrypted_password: hash,
      }
    );

    if (!updatedUser) {
      return res.status(404).send({ message: "User not found." });
    }

    res.send({ message: `Password reset for user with id=${updatedUser.id}.` });
  } catch (err) {
    return res.status(500).send({
      message: `Error resetting password for user with email=${email}: ${err.message}.`,
    });
  }
};

/**
 * Sends a password request email to the user with the given email.
 * @param {*} req The request object.
 * @param {*} res The response object.
 * @returns A status message.
 */
exports.forgotPassword = async (req, res) => {
  const email = req.params.email;

  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      return res
        .status(404)
        .send({ message: "A user with this email address was not found." });
    }

    const token = generateResetToken();

    // Store a hashed version of the token in the database
    const tokenHash = bcrypt.hashSync(token, 10);

    const updatedUser = await User.findOneAndUpdate(
      { email: email },
      {
        password_reset_token: tokenHash,
        password_reset_expiry: new Date(new Date().getTime() + 5 * 60000),
      }
    );

    if (!updatedUser) {
      return res.status(404).send({ message: "User not found." });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.NODEMAIL_EMAIL,
        pass: process.env.NODEMAIL_PASSWORD,
      },
    });

    const options = {
      from: process.env.NODEMAIL_EMAIL,
      to: email,
      subject: "Reset your Inventory password.",
      text: `Follow this link to reset your password: Inventory://reset?token=${token}`,
    };

    transporter.sendMail(options, (err, info) => {
      if (err) {
        return res.status(500).send({
          message: `Error sending password reset email: ${err.message}`,
        });
      } else {
        return res.send({
          message: `Password reset email sent to ${email}`,
        });
      }
    });
  } catch (err) {
    return res.status(500).send({
      message: `Error sending forgot password request for user with id=${id}.`,
    });
  }
};

// Generates a reset token
const generateResetToken = () => {
  var buf = new Buffer(16);
  for (var i = 0; i < buf.length; i++) {
    buf[i] = Math.floor(Math.random() * 256);
  }
  var id = buf.toString("base64");
  return id;
};
