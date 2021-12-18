/**
 * Defines auth operations
 */

import passport from "passport";
import UserModel, { UserDocument } from "../schema/user.schema";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import { NextFunction, Request, Response } from "express";

export const login = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate(
    "local",
    { session: false },
    (err, user: UserDocument, info) => {
      if (err || !user) {
        return next(err);
      }

      // @ts-ignore
      req.logIn(user, { session: false }, async (error) => {
        if (error) return next(error);
        return res.json({
          id: user._id,
          email: user.email,
          token: user.generateJWT(),
        });
      });
    }
  )(req, res, next);
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { password, ...user } = req.body;
    const newUser = new UserModel({ encrypted_password: password, ...user });
    await newUser.save();

    return res.json({
      id: newUser._id,
      email: newUser.email,
      token: newUser.generateJWT(),
    });
  } catch (err: any) {
    return res.sendInternalError(
      `An error occured registering new user: ${err.message}`
    );
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  if (!req.body.password) {
    return res.sendEmptyError();
  }

  const email = req.params.email;
  const resetToken = req.query.token ? String(req.query.token) : "";
  const password = req.body.password;

  try {
    const user = await UserModel.findOne({ email: email });

    if (!user) {
      return res.sendNotFoundError(
        "A user with this email address does not exist."
      );
    }

    await user.resetPassword(resetToken, password);

    res.send({
      message: `Password updated successfully for user with email: ${email}`,
    });
  } catch (err: any) {
    return res.sendInternalError(
      `An error occured resetting the password: ${err}`
    );
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const email = req.params.email;

  try {
    const user = await UserModel.findOne({ email: email });

    if (!user) {
      return res.sendNotFoundError(
        "A user with this email address does not exist."
      );
    }

    const resetToken = await user.getPasswordResetToken();
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
      text: `Follow this link to reset your password: Inventory://reset?token=${resetToken}`,
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
  } catch (err: any) {
    return res.sendInternalError(
      `Error sending forgot password request for user with email=${email}.`
    );
  }
};
