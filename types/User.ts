import { Types } from "mongoose";
import TimestampType from "./TimestampType";

/**
 * The stripped verison of a User stored in documents for display
 */
export interface BaseUser {
  /**
   * The id of the user
   */
  _id: Types.ObjectId;
  /**
   * The name of the user
   */
  name: string;
  /**
   * The photo url of the user
   */
  photoUrl: string;
}

export interface BaseUserWithExpiry extends BaseUser {
  /**
   * When the user's subscription expires, if applicable
   */
  subscriptionExpires: Date;
}

/**
 * The full type for a User.
 */
export interface User extends Omit<BaseUserWithExpiry, "_id">, TimestampType {
  /**
   * The user's email.
   */
  email: string;

  /**
   * Whether the user has verified their email.
   */
  emailVerified: boolean;

  /**
   * The user's phone number.
   */
  phone: string;

  /**
   * Whether the user has verified their phone number.
   */
  phoneVerified: boolean;

  /**
   * The user's oldest owned Location.
   */
  defaultLocation: Types.ObjectId;

  /**
   * The location this user has been a member of the longest
   */
  defaultSharedLocation: Types.ObjectId;

  /**
   * The user's default shopping list
   */
  defaultShoppingList: Types.ObjectId;

  /**
   * The 6 digit code used to verify a user's email/phone number. Also used
   * for 2FA.
   */
  accountVerificationCode?: {
    code: string;
    mode: "email" | "phone" | "2FA";
  };

  /**
   * When the user's account verification code expires, if applicable
   */
  accountVerificationExpiry?: Date;

  /**
   * Whether the user has 2FA enabled
   */
  mfaEnabled: boolean;

  /**
   * The user's password.
   */
  password: string;

  /**
   * The user's refresh token secret. A user can only have one at a time to prevent
   * logins on multiple devices. This may be changed in the future
   */
  refreshTokenSecret: string;

  /**
   * The user's 6 digit password reset code, if applicable.
   */
  passwordResetCode?: string;

  /**
   * When the user's password reset code expires, if applicable.
   */
  passwordResetExpiry?: Date;
}
