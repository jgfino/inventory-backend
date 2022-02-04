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
import AuthErrors from "../error/errors/auth.errors";

/**
 * Login a user with an email/phone number and password.
 */
export const login = catchAsync(async (req, res, next) => {
  const body = req.body;

  const emailOrPhone: string = body.emailOrPhone;
  const password: string = body.password;

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
  const body = req.body;

  const userData = {
    name: body.name,
    password: body.password,
    email: body.email,
    phone: body.phone,
  };

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
  const body = req.body;
  const tokens = await UserModel.refreshTokens(
    body.accessToken,
    body.refreshToken
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
  const body = req.body;

  const emailOrPhone = body.emailOrPhone;
  const resetCode = body.code as string;
  const password = body.password;

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
