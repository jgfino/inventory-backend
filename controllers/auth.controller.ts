import UserModel from "../schema/user.schema";
import { catchAsync } from "../error/catchAsync";
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
 * Login a user with an email/phone number and password.
 */
export const login = catchAsync(async (req, res, next) => {
  const emailOrPhone = req.body.emailOrPhone;
  const password = req.body.password;

  if (!emailOrPhone || !password) {
    return next(
      DatabaseErrors.INVALID_FIELD("Must provide an email and password")
    );
  }

  const user = await UserModel.findByEmailOrPhone(emailOrPhone);
  if (!user) {
    return next(AuthErrors.USER_NOT_FOUND);
  }

  const passwordMatch = user.validatePassword(password);
  if (!passwordMatch) {
    return next(AuthErrors.INCORRECT_PASSWORD);
  } else {
    if (user.mfaEnabled) {
      if (!req.body.code) {
        const verifyCode = await user.getVerificationCode("2FA");
        await sendSMS(user.phone, MFATemplate(verifyCode));
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
 * Register a user with an email/phone number, name, and password. Signs this
 * user in after registration.
 */
export const register = catchAsync(async (req, res, next) => {
  const { emailOrPhone, name, password } = req.body;

  const userData: any = {
    name: name,
    password: password,
  };

  if (!emailOrPhone) {
    return next(DatabaseErrors.INVALID_FIELD());
  }

  if (validator.isEmail(emailOrPhone)) {
    userData.email = emailOrPhone;
  } else if (validator.isMobilePhone(emailOrPhone)) {
    userData.phone = emailOrPhone;
  }

  const newUser = await UserModel.create(userData);
  const tokens = await newUser.generateTokens();
  return res.status(200).json({
    message: "User registered successfully",
    ...tokens,
  });
});

/**
 * Generate new access and refresh tokens based on the provided ones.
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
 * Send a password reset code to the provided email or phone number.
 */
export const forgotPassword = catchAsync(async (req, res, next) => {
  const emailOrPhone = req.body.emailOrPhone;
  const user = await UserModel.findByEmailOrPhone(emailOrPhone);

  if (!user) {
    return next(AuthErrors.USER_NOT_FOUND);
  }

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

/**
 * Reset a user's password. Returns new access/refresh tokens.
 */
export const resetPassword = catchAsync(async (req, res, next) => {
  if (!req.body.password) {
    return next(DatabaseErrors.INVALID_FIELD("Must provide new password"));
  }

  const emailOrPhone = req.params.emailOrPhone;
  const resetCode = req.query.code as string;
  const password = req.body.password;

  const user = await UserModel.findByEmailOrPhone(emailOrPhone);

  if (!user) {
    return next(AuthErrors.USER_NOT_FOUND);
  }

  const tokens = await user.resetPassword(resetCode, password);

  res.status(200).json({
    message: `Password updated successfully`,
    ...tokens,
  });
});
