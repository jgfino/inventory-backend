/**
 * The base type for a User.
 */
export interface BaseUser {
  /**
   * The name/username of the User.
   */
  name: string;

  /**
   * The URL to the User's profile photo.
   */
  photoUrl: string;
}

/**
 * The full type for a User.
 */
export interface User extends BaseUser {
  /**
   * The user's email.
   */
  email: string;

  /**
   * Whether the user has verified their email.
   */
  email_verified: boolean;

  /**
   * The user's phone number.
   */
  phone: string;

  /**
   * Whether the user has verified their phone number.
   */
  phone_verified: boolean;

  /**
   * The 6 digit code used to verify a user's email/phone number. Also used
   * for 2FA.
   */
  account_verification_code?: {
    code: string;
    mode: "email" | "phone" | "2FA";
  };

  /**
   * When the user's account verification code expires, if applicable
   */
  account_verification_expiry?: Date;

  /**
   * Whether the user has 2FA enabled
   */
  mfa_enabled: boolean;

  /**
   * The user's password.
   */
  password: string;

  /**
   * The user's refresh token secret. A user can only have one at a time to prevent
   * logins on multiple devices. This may be changed in the future
   */
  refresh_token_secret: string;

  /**
   * The user's 6 digit password reset code, if applicable.
   */
  password_reset_code?: string;

  /**
   * When the user's password reset code expires, if applicable.
   */
  password_reset_expiry?: Date;
}
