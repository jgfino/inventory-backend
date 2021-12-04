declare global {
  namespace Express {
    interface User {
      id: String;
    }
    interface Request {
      user: User;
    }
    interface Response {
      sendNotFoundError(msg: String): void;
      sendInternalError(msg: String): void;
      sendEmptyError(): void;
    }
  }
}

export default interface User {
  name: String;
  email: String;
  email_verified: Boolean;
  encrypted_password: String;
  password_reset_token: String;
  password_reset_expiry: Date;
  third_party_auth: [ThirdPartyAuth];
}

interface ThirdPartyAuth {
  provider_name: String;
  provider_id: String;
  provider_data: any;
}
