export interface SMSTemplate {
  body: string;
}

export const VerifyPhoneTemplate = (code: string): SMSTemplate => {
  return {
    body: `Your Inventory phone number verification code is: ${code}`,
  };
};

export const MFATemplate = (code: string): SMSTemplate => {
  return {
    body: `Your Inventory 2FA code is: ${code}`,
  };
};

export const ForgotPasswordTextTemplate = (code: string): SMSTemplate => {
  return {
    body: `Your Inventory password reset code is: ${code}`,
  };
};
