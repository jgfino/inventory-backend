//@ts-nocheck

import { HydratedDocument, Model, model, Schema } from "mongoose";
import { BaseUserWithExpiry, User } from "../types/User";
import bcrypt from "bcryptjs";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import LocationModel from "./location.schema";
import mongoose from "mongoose";
import validator from "validator";
import crypto from "crypto";
import AuthErrors from "../error/errors/auth.errors";
import DatabaseErrors from "../error/errors/database.errors";
import ShoppingListModel from "./shoppingList.schema";

//#region Types

/**
 * The type returned from auth methods
 */
type AuthJSON = {
  id: string;
  accessToken: string;
  refreshToken: string;
};

interface UserInstanceMethods {
  /**
   * Determines if the given password is correct for this user.
   * @param password The password to check.
   * @returns True if the correct password was given, false otherwise.
   */
  validatePassword(password: string): boolean;

  /**
   * Generates new access and refresh tokens for this user.
   * @returns The new refresh and access tokens.
   */
  generateTokens(): Promise<AuthJSON>;

  /**
   * Enable 2fa for this user
   */
  enable2fa(): Promise<void>;

  /**
   * Disables 2fa for this user
   */
  disable2fa(): Promise<void>;

  /**
   * Get and set a 6 digit code for account verification
   * @param mode The mode to get the code for.
   * @returns The account verification code.
   */
  getVerificationCode(mode: "email" | "phone" | "2FA"): Promise<string>;

  /**
   * Verify the given account verification code for the given mode.
   * @param code The code to verify
   * @param mode The mode to use for verification.
   */
  verifyCode(code: string, mode: "email" | "phone" | "2FA"): Promise<void>;

  /**
   * Get and set a password reset code for this user
   * @returns The password reset code.
   */
  getPasswordResetCode(): Promise<string>;

  /**
   * Reset's this user's password with the given code.
   * @param code The reset code to use.
   * @param newPassword The user's new password.
   */
  resetPassword(code: string, newPassword: string): Promise<AuthJSON>;
}

/**
 * The user model type w/static methods
 */
interface UserModel extends Model<User, {}, UserInstanceMethods> {
  /**
   * Refreshes the tokens for the user identified by the given tokens
   * @param accessToken The user's access token
   * @param refreshToken The user's refresh token
   */
  refreshTokens(accessToken: string, refreshToken: string): Promise<AuthJSON>;

  /**
   * Find a user by email or password
   * @param emailOrPhone Email or phone number
   */
  findByEmailOrPhone(
    emailOrPhone: string
  ): Promise<HydratedDocument<User, UserInstanceMethods>>;

  /**
   * Determine if the user with the given ID is a premium user
   * @param id The id of the user to check
   * @returns True if the user is a premium member
   */
  isPremium(user: BaseUserWithExpiry): boolean;
}

//#endregion

//#region Schema

/**
 * User schema definition
 */
const UserSchema = new Schema<User, UserModel, UserInstanceMethods>(
  {
    name: {
      type: String,
      trim: true,
      required: [true, "Name is required."],
      maxlength: 100,
    },
    photoUrl: {
      type: String,
    },
    email: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: (v?: string) => (v ? validator.isEmail(v) : true),
        message: "Invalid email format.",
      },
      set: (v?: string) =>
        v ? validator.normalizeEmail(v, { all_lowercase: true }) : v,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
      validate: {
        validator: (v?: string) =>
          v ? validator.isMobilePhone(v, "any", { strictMode: true }) : true,
        message: "Invalid phone number format.",
      },
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    subscriptionExpires: {
      type: Date,
    },
    defaultLocation: {
      type: Schema.Types.ObjectId,
      ref: "Location",
    },
    defaultSharedLocation: {
      type: Schema.Types.ObjectId,
      ref: "Location",
    },
    defaultShoppingList: {
      type: Schema.Types.ObjectId,
      ref: "ShoppingList",
    },
    accountVerificationCode: {
      type: {
        code: String,
        mode: String,
      },
    },
    accountVerificationExpiry: {
      type: Date,
    },
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    password: {
      required: [true, "Password is required."],
      type: String,
      validate: {
        validator: validator.isStrongPassword,
        message:
          "Password must be 8 characters, contain at least 1 uppercase letter, 1 symbol, and 1 number.",
      },
    },
    refreshTokenSecret: {
      type: String,
    },
    passwordResetCode: {
      type: String,
    },
    passwordResetExpiry: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.refreshTokenSecret;
        delete ret.accountVerificationCode;
        delete ret.accountVerificationExpiry;
        delete ret.password;
        delete ret.passwordResetCode;
        delete ret.passwordResetExpiry;
      },
      virtuals: true,
    },
    toObject: { virtuals: true },
  }
);

//#endregion

//#region Middleware

// Hash password before saving. Update user fields in other documents
UserSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const hash = bcrypt.hashSync(this.password, 10);
    this.password = hash;
  }

  if (this.isModified("email")) {
    this.emailVerified = false;
  }

  if (this.isModified("phone")) {
    this.phoneVerified = false;
    this.mfaEnabled = false;
  }

  if (!this.isNew) {
    if (this.isModified("name")) {
      await LocationModel.updateMany(
        { "owner.id": this.id },
        { "owner.name": this.name }
      );

      await LocationModel.updateMany(
        { "members.id": this.id },
        { "members.$.name": this.name }
      );

      await LocationModel.updateMany(
        { "items.owner._id": this.id },
        { "items.$.owner.name": this.name }
      );

      await ShoppingListModel.updateMany(
        { "owner.id": this.id },
        { "owner.name": this.name }
      );

      await ShoppingListModel.updateMany(
        { "members.id": this.id },
        { "members.$.name": this.name }
      );
    }

    if (this.isModified("photoUrl")) {
      await LocationModel.updateMany(
        { "owner.id": this.id },
        { "owner.photoUrl": this.photoUrl }
      );

      await LocationModel.updateMany(
        { "members.id": this.id },
        { "members.$.photoUrl": this.photoUrl }
      );

      await LocationModel.updateMany(
        { "items.owner._id": this.id },
        { "items.$.owner.photoUrl": this.photoUrl }
      );

      await ShoppingListModel.updateMany(
        { "owner.id": this.id },
        { "owner.photoUrl": this.photoUrl }
      );

      await ShoppingListModel.updateMany(
        { "members.id": this.id },
        { "members.$.photoUrl": this.photoUrl }
      );
    }

    if (this.isModified("subscriptionExpires")) {
      await LocationModel.updateMany(
        { "owner.id": this.id },
        { "owner.subscriptionExpires": this.subscriptionExpires }
      );

      await ShoppingListModel.updateMany(
        { "owner.id": this.id },
        { "owner.subscriptionExpires": this.subscriptionExpires }
      );
    }
  }

  next();
});

// Make sure the user always has a unique email or phone number
UserSchema.pre("validate", async function (next) {
  if (!this.email && !this.phone) {
    return next(
      DatabaseErrors.INVALID_FIELD(
        "A user must have either a valid email or phone number at all times."
      )
    );
  }

  const model = mongoose.models["User"] as UserModel;
  let otherEmail: HydratedDocument<User, UserInstanceMethods>[] = [];
  let otherPhone: HydratedDocument<User, UserInstanceMethods>[] = [];

  if (this.email) {
    otherEmail = await model
      .where("email")
      .equals(this.email)
      .where("_id")
      .ne(this._id)
      .exec();
  }

  if (this.phone) {
    otherPhone = await model
      .where("phone")
      .equals(this.phone)
      .where("_id")
      .ne(this._id)
      .exec();
  }

  if (otherEmail.length > 0) {
    return next(
      DatabaseErrors.DUPLICATE_FIELD(
        "Email addresses must be unique to each user."
      )
    );
  } else if (otherPhone.length > 0) {
    return next(
      DatabaseErrors.DUPLICATE_FIELD(
        "Phone numbers must be unique to each user."
      )
    );
  }
  next();
});

// Handle effects of deleting a user
UserSchema.pre("remove", async function (next) {
  // The operations to execute
  const promises: Promise<any>[] = [];

  // Delete locations owned by this user
  const locations = await LocationModel.find({ owner: this._id });
  locations.forEach((doc) => {
    promises.push(doc.remove());
  });

  // Remove membership of this user in locations
  promises.push(
    LocationModel.updateMany(
      { members: this._id },
      {
        $pull: {
          members: { _id: this._id },
          notificationDays: { user: this._id },
          lastOpened: { user: this._id },
        },
      }
    ).exec()
  );

  // Remove this user last updating a location
  promises.push(
    LocationModel.updateMany(
      { "lastUpdatedBy._id": this._id },
      { $set: { lastUpdatedBy: { _id: null, name: "Deleted User" } } }
    ).exec()
  );

  // Delete items owned by this user
  promises.push(
    LocationModel.updateMany(
      { "items.owner._id": this.id },
      { $pull: { items: { "owner._id": this.id } } }
    ).exec()
  );

  // Delete lists owned by this user
  const lists = await ShoppingListModel.find({ owner: this.id });
  lists.forEach((doc) => promises.push(doc.remove()));

  // Delete items in lists owned by this user
  const listsWithItems = await ShoppingListModel.find({
    "items.owner._id": this._id,
  });
  promises.push(
    listsWithItems.map(async (list) => {
      // Remove items owned by this user
      list.items = list.items.filter(
        (item) => item.owner._id.toString() != this._id.toString()
      );

      // Sort remaining items by position
      list.items.sort((a, b) => a.pos - b.pos);

      // Redo item positions
      for (let i = 0; i < list.items.length; i++) {
        list.items[i].pos = i;
      }

      await list.save();
    })
  );

  // Await async operations
  await Promise.all(promises);

  next();
});

//#endregion

//#region Static methods

// Generates new access and refresh tokens for the user identified by the tokens
UserSchema.statics.refreshTokens = async function (
  accessToken: string,
  refreshToken: string
) {
  let decoded: jwt.JwtPayload;
  try {
    decoded = jwt.verify(accessToken, process.env.JWT_SECRET, {
      ignoreExpiration: true,
    }) as jwt.JwtPayload;
  } catch (err) {
    if (err instanceof JsonWebTokenError) {
      return Promise.reject(
        AuthErrors.JWT_INVALID("An invalid access token was provided")
      );
    } else {
      console.log(err);
      return Promise.reject(AuthErrors.UNKNOWN);
    }
  }

  const user: { _id: string } = decoded.user;
  const userDoc = await this.findById(user._id);

  let decodedRefresh: jwt.JwtPayload;
  try {
    decodedRefresh = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    ) as jwt.JwtPayload;
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return Promise.reject(
        AuthErrors.JWT_EXPIRED(
          "Refresh token has expired. Please re-authenticate."
        )
      );
    } else if (err instanceof JsonWebTokenError) {
      return Promise.reject(
        AuthErrors.JWT_INVALID("An invalid refresh token was provided.")
      );
    } else {
      console.log(err);
      return Promise.reject(AuthErrors.UNKNOWN);
    }
  }

  if (bcrypt.compareSync(decodedRefresh.jti, userDoc.refreshTokenSecret)) {
    return await userDoc.generateTokens();
  } else {
    return Promise.reject(
      AuthErrors.JWT_INVALID("An invalid refresh token was provided.")
    );
  }
};

// Find a user by email or phone
UserSchema.statics.findByEmailOrPhone = async function (emailOrPhone: string) {
  let user: HydratedDocument<User, UserInstanceMethods>;

  if (!emailOrPhone) {
    return Promise.reject(AuthErrors.USER_NOT_FOUND);
  }

  if (validator.isEmail(emailOrPhone)) {
    user = await UserModel.findOne({ email: emailOrPhone });
  } else if (validator.isMobilePhone(emailOrPhone)) {
    user = await UserModel.findOne({ phone: emailOrPhone });
  }

  return user;
};

UserSchema.statics.isPremium = function (user: BaseUserWithExpiry) {
  return user.subscriptionExpires > new Date();
};

//#endregion

//#region Document methods

// Check if the given password matches the user's password
UserSchema.methods.validatePassword = function (password: string) {
  return bcrypt.compareSync(password, this.password);
};

// Generate and save a refresh token for this user. Also generates access token
UserSchema.methods.generateTokens = async function () {
  const body = { _id: this._id };

  const refreshSecret = crypto.randomBytes(16).toString("base64");
  const refreshToken = jwt.sign(
    { user: body },
    process.env.JWT_REFRESH_SECRET!,
    {
      expiresIn: "7 days",
      jwtid: refreshSecret,
    }
  );

  const accessToken = jwt.sign({ user: body }, process.env.JWT_SECRET!, {
    expiresIn: "7 days", // TODO: 15 mins
  });

  this.refreshTokenSecret = bcrypt.hashSync(refreshSecret, 10);
  await this.save();

  return {
    id: this._id,
    accessToken: accessToken,
    refreshToken: refreshToken,
  };
};

// Enable 2fa for this user, if possible.
UserSchema.methods.enable2fa = async function () {
  if (!this.phone || !this.phoneVerified) {
    return Promise.reject(AuthErrors.MFA_NO_PHONE);
  } else {
    this.mfaEnabled = true;
    await this.save();
  }
};

// Disable 2fa for this user.
UserSchema.methods.disable2fa = async function () {
  this.mfaEnabled = false;
  await this.save();
};

// Get and set a 6 digit account verification code for the given mode
UserSchema.methods.getVerificationCode = async function (
  mode: "email" | "phone" | "2FA"
) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = bcrypt.hashSync(code, 10);

  this.accountVerificationCode = {
    mode: mode,
    code: codeHash,
  };

  // 5 minutes
  this.accountVerificationExpiry = new Date(new Date().getTime() + 5 * 60000);
  await this.save();

  return code;
};

// Verify the given mode with given code
UserSchema.methods.verifyCode = async function (
  code: string,
  mode: "email" | "phone" | "2FA"
) {
  if (
    !this.accountVerificationCode ||
    !this.accountVerificationExpiry ||
    !bcrypt.compareSync(code, this.accountVerificationCode.code) ||
    this.accountVerificationCode.mode != mode
  ) {
    return Promise.reject(AuthErrors.INVALID_CODE);
  }

  if (this.accountVerificationExpiry.getTime() < new Date().getTime()) {
    return Promise.reject(AuthErrors.EXPIRED_CODE);
  }

  switch (mode) {
    case "email":
      this.emailVerified = true;
      break;
    case "phone":
      this.phoneVerified = true;
      break;
  }

  this.accountVerificationCode = undefined;
  this.accountVerificationExpiry = undefined;
  await this.save();
};

// Get and set a password reset token for this user
UserSchema.methods.getPasswordResetCode = async function () {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = bcrypt.hashSync(code, 10);

  this.passwordResetCode = codeHash;
  this.passwordResetExpiry = new Date(new Date().getTime() + 5 * 60000); // 5 minutes
  await this.save();

  return code;
};

// Reset the user's password and reset tokens
UserSchema.methods.resetPassword = async function (
  code: string,
  newPassword: string
) {
  if (
    !this.passwordResetCode ||
    !this.passwordResetExpiry ||
    !bcrypt.compareSync(code, this.passwordResetCode)
  ) {
    return Promise.reject(AuthErrors.INVALID_CODE);
  }

  if (this.passwordResetExpiry.getTime() < new Date().getTime()) {
    return Promise.reject(AuthErrors.EXPIRED_CODE);
  }

  this.password = newPassword;
  this.passwordResetExpiry = undefined;
  this.passwordResetCode = undefined;
  await this.save();

  return await this.generateTokens();
};

//#endregion

const UserModel = model<User, UserModel>("User", UserSchema);

export default UserModel;
