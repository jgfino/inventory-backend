/**
 * Type for email templates
 */
export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

/**
 * Email template for a password reset email.
 * @param resetCode The reset code to include in the reset url
 * @returns A ForgotPassword email template
 */
export const ForgotPasswordEmailTemplate = (
  resetCode: string
): EmailTemplate => {
  return {
    subject: "Your Inventory Password Reset Code",
    text:
      `Hey there! Looks like you forgot your Inventory password.` +
      `To reset it, please enter this code:\n` +
      `${resetCode}`,
    html:
      `<p>Hey there! Looks like you forgot your Inventory password.` +
      `To reset it, please enter the code below:\n</p><h2>${resetCode}</h2>`,
  };
};

/**
 * Email template for a email confirmation email.
 * @param verifyCode The email verification code.
 * @returns An email verification email template.
 */
export const VerifyEmailTemplate = (verifyCode: string): EmailTemplate => {
  return {
    subject: "Your Inventory Verification Code",
    text: `Enter this code to verify your email:\n` + `${verifyCode}`,
    html:
      `<p>Enter this code to verify your email:\n` + `<h2>${verifyCode}</h2>`,
  };
};
