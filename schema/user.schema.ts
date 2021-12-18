import { Document, model, Schema } from "mongoose";
import BaseModel from "../types/BaseModel";
import BaseQuery from "../types/BaseQuery";
import { User } from "../types/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export interface UserDocument extends Document, Omit<User, "_id"> {
  getPasswordResetToken(): Promise<string>;
  validatePassword(password: string): boolean;
  resetPassword(token: string, newPassword: string): Promise<void>;
  generateJWT(): string;
  hashPassword(): Promise<void>;
}

export type UserQuery = BaseQuery<UserDocument, UserQueryHelpers>;
type UserQueryHelpers = {};

interface UserModel extends BaseModel<UserDocument, UserQueryHelpers> {}

const UserSchema = new Schema<UserDocument, UserModel>(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    email_verified: {
      type: Boolean,
      default: false,
    },
    encrypted_password: {
      required: true,
      type: String,
    },
    password_reset_token: {
      type: String,
    },
    password_reset_expiry: {
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
        delete ret.encrypted_password;
        delete ret.password_reset_token;
        delete ret.password_reset_expiry;
      },
    },
  }
);

UserSchema.pre("save", function (next) {
  if (this.isModified("encrypted_password")) {
    const hash = bcrypt.hashSync(this.encrypted_password, 10);
    this.encrypted_password = hash;
  }
  next();
});

UserSchema.methods.validatePassword = function (password: string) {
  const hash = bcrypt.hashSync(password, 10);
  console.log(this);
  return bcrypt.compareSync(hash, this.encrypted_password);
};

UserSchema.methods.resetPassword = async function (
  token: string,
  newPassword: string
) {
  if (!this.password_reset_token || !this.password_reset_expiry) {
    return Promise.reject({
      message: "No password reset token found for user.",
    });
  }

  if (!bcrypt.compareSync(token, this.password_reset_token)) {
    return Promise.reject({ message: "Invalid password reset token." });
  }

  if (this.password_reset_expiry.getTime() < new Date().getTime()) {
    return Promise.reject({ message: "Password reset token has expired." });
  }

  this.encrypted_password = newPassword;
  this.password_reset_expiry = null;
  this.password_reset_token = null;
  this.save();
};

UserSchema.methods.generateJWT = function () {
  const body = { _id: this._id, email: this.email };
  return jwt.sign({ user: body }, process.env.JWT_SECRET!);
};

UserSchema.methods.getPasswordResetToken = async function () {
  const token = generateResetToken();
  const tokenHash = bcrypt.hashSync(token, 10);

  this.password_reset_token = tokenHash;
  this.password_reset_expiry = new Date(new Date().getTime() + 5 * 60000);
  await this.save();

  return token;
};

const generateResetToken = () => {
  var buf = Buffer.alloc(16);
  for (var i = 0; i < buf.length; i++) {
    buf[i] = Math.floor(Math.random() * 256);
  }
  var id = buf.toString("base64");
  return id;
};

export default model<UserDocument, UserModel>("User", UserSchema);
