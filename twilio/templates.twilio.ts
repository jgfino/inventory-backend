export interface SMSTemplate {
  body: string;
}

/**
 * SMS template for verifying a user's phone number
 * @param code The verification code
 * @returns The template
 */
export const VerifyPhoneTemplate = (code: string): SMSTemplate => {
  return {
    body: `Your Inventory phone number verification code is: ${code}`,
  };
};

/**
 * SMS template for sending a 2FA text
 * @param code The verification code
 * @returns The template
 */
export const MFATemplate = (code: string): SMSTemplate => {
  return {
    body: `Your Inventory 2FA code is: ${code}`,
  };
};

/**
 * SMS template for sending a password reset text
 * @param code The verification code.
 * @returns The template
 */
export const ForgotPasswordTextTemplate = (code: string): SMSTemplate => {
  return {
    body: `Your Inventory password reset code is: ${code}`,
  };
};
