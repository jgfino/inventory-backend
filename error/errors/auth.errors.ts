import ErrorResponse from "../ErrorResponse";

const AuthErrors = {
  JWT_EXPIRED: (detail?: string) =>
    new ErrorResponse("auth/jwt-expired", 401, "JWT token expired", detail),
  JWT_INVALID: (detail?: string) =>
    new ErrorResponse("auth/jwt-invalid", 401, "JWT token invalid", detail),
  NO_EMAIL: new ErrorResponse(
    "auth/no-email",
    404,
    "An email address was not found for this user"
  ),
  NO_PHONE: new ErrorResponse(
    "auth/no-phone",
    404,
    "A phone number was not found for this user"
  ),
  INVALID_CODE: new ErrorResponse(
    "auth/invalid-code",
    401,
    "Invalid verification code provided",
    "Invalid verification code. Please enter the code again or request a new one"
  ),
  EXPIRED_CODE: new ErrorResponse(
    "auth/expired-code",
    401,
    "Verification code has expired",
    "Verification code has expired, please request a new one."
  ),
  INCORRECT_PASSWORD: new ErrorResponse(
    "auth/incorrect-password",
    401,
    "Incorrect password"
  ),
  USER_NOT_FOUND: new ErrorResponse(
    "auth/user-not-found",
    404,
    "A user with this email/phone number was not found."
  ),
  MFA_NO_TOKEN: new ErrorResponse(
    "auth/2fa-no-token",
    401,
    "2FA is enabled for this user, but no token was provided.",
    "A verification code has been sent to this user's phone number. Please enter it on the next login request."
  ),
  MFA_INVALID_TOKEN: new ErrorResponse(
    "auth/2fa-invalid-token",
    401,
    "An invalid 2fa token was provided"
  ),
  MFA_NO_PHONE: new ErrorResponse(
    "auth/2fa-no-phone",
    404,
    "A verified phone number for this user was not found.",
    "Ensure this user has a verified phone number before enabling 2fa"
  ),
  UNKNOWN: new ErrorResponse(
    "auth/unknown",
    500,
    "An unknwon auth error occured."
  ),
};

export default AuthErrors;
