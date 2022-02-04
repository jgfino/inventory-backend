import UserModel from "../schema/user.schema";
import { catchAsync } from "../error/catchAsync";
import { sendMail } from "../nodemailer/mailer";
import { VerifyEmailTemplate } from "../nodemailer/templates.nodemailer";
import { sendSMS } from "../twilio/sms";
import { VerifyPhoneTemplate } from "../twilio/templates.twilio";
import AuthErrors from "../error/errors/auth.errors";
import aws from "aws-sdk";
import { Joi } from "express-validation";

/**
 * Get the full profile for the currently logged-in user
 */
export const getProfile = catchAsync(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id);

  if (!user) {
    return next(AuthErrors.USER_NOT_FOUND);
  }

  res.status(200).send(user);
});

/**
 * Update the currently logged-in user's profile. Updatable fields include name,
 * email, phone, and password. Updating email or phone will unverify any
 * verified email address or phone number.
 */
export const updateProfile = catchAsync(async (req, res, next) => {
  const { name, email, phone, password } = req.body;
  const user = await UserModel.findById(req.user._id);

  if (!user) {
    return next(AuthErrors.USER_NOT_FOUND);
  }

  name !== undefined && (user.name = name);
  email !== undefined && (user.email = email);
  phone !== undefined && (user.phone = phone);
  password !== undefined && (user.password = password);

  await user.save();

  res.status(200).json({
    message: "User updated successfully",
  });
});

/**
 * Delete the currently logged-in user's profile. WARNING: this will delete all
 * user data as well as Locations, Items, Shopping Lists owned by this user. Use
 * with caution.
 */
export const deleteProfile = catchAsync(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id);

  if (!user) {
    return next(AuthErrors.USER_NOT_FOUND);
  }

  await user.remove();
  res.status(200).send({ message: "User deleted successfully" });
});

// Initialize s3
const s3 = new aws.S3({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
  },
});

/**
 * Update the profile image for the currently logged-in user.
 */
export const addPhoto = catchAsync(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id);

  if (!user) {
    return next(AuthErrors.USER_NOT_FOUND);
  }

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: req.user._id.toString() + "-full.jpg",
    Body: req.file.buffer,
    ACL: "public-read-write",
    ContentType: "image/jpeg",
  };

  const data = await s3.upload(params).promise();
  user.photoUrl = data.Location;

  await user.save();

  res.status(200).send({ message: "Photo added successfully." });
});

/**
 * Delete the profile image for the currently logged-in user.
 */
export const removePhoto = catchAsync(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id);

  if (!user) {
    return next(AuthErrors.USER_NOT_FOUND);
  }

  await s3
    .deleteObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: req.user._id.toString() + "-full.jpg",
    })
    .promise();

  user.photoUrl = undefined;
  await user.save();

  res.status(200).send({ message: "Photo removed successfully." });
});

/**
 * Send a verification email to the currently logged-in user.
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
 * Verify the currently logged-in user's email address using the code they
 * received.
 */
export const verifyEmail = catchAsync(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id);
  const code = req.body.code;

  if (!user || !user.email) {
    return next(AuthErrors.NO_EMAIL);
  }

  await user.verifyCode(code, "email");

  res.status(200).json({
    message: "Email verified successfully.",
  });
});

/**
 * Send a verification text to the currently logged-in user
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
 * Verify the currently logged-in user's phone number using the code they received
 */
export const verifyPhone = catchAsync(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id);
  const code = req.body.code;

  if (!user || !user.phone) {
    return next(AuthErrors.NO_PHONE);
  }

  await user.verifyCode(code, "phone");

  res.status(200).json({
    message: "Phone number verified successfully.",
  });
});

/**
 * Enables multi-factor authentication for the currently logged-in user.
 */
export const enableMfa = catchAsync(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id);

  if (!user) {
    return next(AuthErrors.USER_NOT_FOUND);
  }

  await user.enable2fa();

  res.status(200).json({
    message: "2FA enabled successfully",
  });
});

/**
 * Disables multi-factor authentication for the currently logged-in user.
 */
export const disableMfa = catchAsync(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id);

  if (!user) {
    return next(AuthErrors.USER_NOT_FOUND);
  }

  await user.disable2fa();

  res.status(200).json({
    message: "2FA disabled successfully",
  });
});
