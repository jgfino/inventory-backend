import UserModel from "../schema/user.schema";
import { catchAsync } from "../error/catchAsync";
import { sendMail } from "../nodemailer/mailer";
import { VerifyEmailTemplate } from "../nodemailer/templates.nodemailer";
import { sendSMS } from "../twilio/sms";
import { VerifyPhoneTemplate } from "../twilio/templates.twilio";
import AuthErrors from "../error/errors/auth.errors";
import LocationModel from "../schema/location.schema";
import ItemModel from "../schema/item.schema";
import InvitationModel from "../schema/invitation.schema";

/**
 * Get the currently logged-in user
 */
export const getProfile = catchAsync(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id);

  if (!user) {
    return next(AuthErrors.USER_NOT_FOUND);
  }

  const locations = await LocationModel.find({ owner: user._id }).distinct(
    "_id"
  );
  const items = await ItemModel.find({ owner: user._id }).distinct("_id");
  const invitations = await InvitationModel.find({
    to: user._id,
  }).countDocuments();

  const json: any = user.toJSON();
  json.locations = locations;
  json.items = items;
  json.invitations = invitations;

  res.status(200).send(json);
});

/**
 * Delete the currently logged-in user
 */
export const deleteProfile = catchAsync(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id);

  if (!user) {
    return next(AuthErrors.USER_NOT_FOUND);
  }

  await user.remove();
  res.status(200).send({ message: "User deleted successfully" });
});

/**
 * Updates the current user. Updatable fields include email, phone, name.
 */
export const updateProfile = catchAsync(async (req, res, next) => {
  const body = req.body;
  const user = await UserModel.findById(req.user._id);

  body.name !== undefined && (user.name = body.name);
  body.email !== undefined && (user.email = body.email);
  body.phone !== undefined && (user.phone = body.phone);

  await user.save();
  res.status(200).json({
    message: "User updated successfully",
  });
});

/**
 * Send a verification email to the logged-in user's email address. Errors
 * if the logged in user does not have a registered email address.
 */
export const sendVerificationEmail = catchAsync(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id);

  if (!user || !user.email) {
    return next(AuthErrors.NO_EMAIL);
  }

  const verifyCode = await user.getVerificationCode("email");
  await sendMail(user.email, VerifyEmailTemplate(verifyCode));

  res.status(200).json({
    message: `Verification email sent to ${user.email}`,
  });
});

/**
 * Verify the logged-in user's email address using the provided code.
 */
export const verifyEmail = catchAsync(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id);
  const code = (req.query.code as string) ?? "";

  if (!user || !user.email) {
    return next(AuthErrors.NO_EMAIL);
  }

  await user.verifyCode(code, "email");

  res.status(200).json({
    message: "Email verified successfully.",
  });
});

/**
 * Send a phone number verification code to the logged-in user's phone number.
 * Errors if the logged in user does not have a registered phone number.
 */
export const sendTextVerificationCode = catchAsync(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id);

  if (!user || !user.phone) {
    return next(AuthErrors.NO_PHONE);
  }

  const verifyCode = await user.getVerificationCode("phone");
  await sendSMS(user.phone, VerifyPhoneTemplate(verifyCode));

  res.status(200).json({
    message: `Verification text sent to ${user.phone}`,
  });
});

/**
 * Verify the logged-in user's phone number using the given code
 */
export const verifyPhone = catchAsync(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id);
  const code = (req.query.code as string) ?? "";

  if (!user || !user.phone) {
    return next(AuthErrors.NO_PHONE);
  }

  await user.verifyCode(code, "phone");

  res.status(200).json({
    message: "Phone number verified successfully.",
  });
});

/**
 * Enables 2fa for the logged-in user. 2fa can only be enabled if the user
 * has a registered phone number.
 */
export const enable2fa = catchAsync(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id);
  await user.enable2fa();

  res.status(200).json({
    message: "2FA enabled successfully",
  });
});

/**
 * Disables 2fa for the logged-in user.
 */
export const disable2fa = catchAsync(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id);
  await user.disable2fa();

  res.status(200).json({
    message: "2FA disabled successfully",
  });
});
