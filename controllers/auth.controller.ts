/**
 * Authentication methods for user registering, login, password management
 */

import UserModel from "../schema/user.schema";
import { catchAsync } from "../error/errorHandling";
import { sendMail } from "../nodemailer/mailer";
import { ForgotPasswordEmailTemplate } from "../nodemailer/templates.nodemailer";
import { sendSMS } from "../twilio/sms";
import validator from "validator";
import {
  ForgotPasswordTextTemplate,
  MFATemplate,
} from "../twilio/templates.twilio";
import DatabaseErrors from "../error/errors/database.errors";
import AuthErrors from "../error/errors/auth.errors";

/**
 * Login a user, generating a new refresh token and 1 hr JWT.
 * @param req The request object.
 * @param res The response object.
 * @param next The next function.
 */
export const login = catchAsync(async (req, res, next) => {
  const emailOrPhone = req.body.emailOrPhone;
  const password = req.body.password;

  if (!emailOrPhone || !password) {
    return next(DatabaseErrors.INVALID_FIELD());
  }

  const user = await UserModel.findByEmailOrPhone(emailOrPhone);

  const passwordMatch = user.validatePassword(password);
  if (!passwordMatch) {
    return next(AuthErrors.INCORRECT_PASSWORD);
  } else {
    if (user.mfa_enabled) {
      if (!req.body.code) {
        const verifyCode = await user.getVerificationCode("2FA");
        sendSMS(user.phone, MFATemplate(verifyCode));
        return next(AuthErrors.MFA_NO_TOKEN);
      } else {
        await user.verifyCode(req.body.code, "2FA");
      }
    }
    const tokens = await user.generateTokens();
    return res.status(200).json({
      message: "User logged in successfully",
      ...tokens,
    });
  }
});

/**
 * Register a new user and log them in.
 */
export const register = catchAsync(async (req, res, next) => {
  const { emailOrPhone, ...userData } = req.body;

  if (!emailOrPhone) {
    return next(DatabaseErrors.INVALID_FIELD());
  }

  if (validator.isEmail(emailOrPhone)) {
    userData.email = emailOrPhone;
  } else if (validator.isMobilePhone(emailOrPhone)) {
    userData.phone = emailOrPhone;
  }

  const newUser = new UserModel(userData);

  await newUser.save();
  const tokens = await newUser.generateTokens();
  return res.status(200).json({
    message: "User registered successfully",
    ...tokens,
  });
});

/**
 * Refresh a user's tokens using their access and refresh tokens.
 */
export const refreshToken = catchAsync(async (req, res, next) => {
  if (!req.body.refreshToken) {
    return next(DatabaseErrors.INVALID_FIELD("Must provide refresh token"));
  }

  if (!req.body.accessToken) {
    return next(DatabaseErrors.INVALID_FIELD("Must provide access token"));
  }

  const tokens = await UserModel.refreshTokens(
    req.body.accessToken,
    req.body.refreshToken
  );

  return res.status(200).json({
    message: "Tokens refreshed successfully",
    ...tokens,
  });
});

/**
 * Reset a user's password. Returns new access/refresh tokens.
 */
export const resetPassword = catchAsync(async (req, res, next) => {
  if (!req.body.password) {
    return next(DatabaseErrors.INVALID_FIELD("Must provide new password"));
  }

  const emailOrPhone = req.params.emailOrPhone;
  const resetCode = (req.query.code as string) ?? "";
  const password = req.body.password;

  const user = await UserModel.findByEmailOrPhone(emailOrPhone);
  const tokens = await user.resetPassword(resetCode, password);

  res.status(200).json({
    message: `Password updated successfully`,
    ...tokens,
  });
});

/**
 * Set a user's password reset code and notify them by email or text
 */
export const forgotPassword = catchAsync(async (req, res, next) => {
  const emailOrPhone = req.params.emailOrPhone;
  const user = await UserModel.findByEmailOrPhone(emailOrPhone);

  const resetCode = await user.getPasswordResetCode();

  if (validator.isEmail(emailOrPhone)) {
    await sendMail(emailOrPhone, ForgotPasswordEmailTemplate(resetCode));
  } else if (validator.isMobilePhone(emailOrPhone)) {
    await sendSMS(emailOrPhone, ForgotPasswordTextTemplate(resetCode));
  }

  res.status(200).json({
    message: `Password reset code sent to ${emailOrPhone}`,
  });
});
