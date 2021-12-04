import { Document, model, Schema } from "mongoose";
import User from "../types/User";

export interface UserDocument extends Document, User {}

const ThirdPartyAuthSchema = new Schema({
  provider_name: {
    type: String,
    default: null,
  },
  provider_id: {
    type: String,
    default: null,
  },
  provider_data: {
    type: {},
    default: null,
  },
});

const UserSchema = new Schema(
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
      type: String,
    },
    password_reset_token: {
      type: String,
      default: null,
    },
    password_reset_expiry: {
      type: Date,
      default: null,
    },
    third_party_auth: [ThirdPartyAuthSchema],
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

const User = model<User>("User", UserSchema);

module.exports = User;
