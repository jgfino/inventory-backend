/**
 * The base type for a User.
 */
export interface BaseUser {
  /**
   * The id of the User.
   */
  _id: string;

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
   * The user's encrypted password.
   */
  encrypted_password: string;

  /**
   * The user's password reset token, if applicable.
   */
  password_reset_token: string | null;

  /**
   * When the user's password reset token expires, if applicable.
   */
  password_reset_expiry: Date | null;
}
