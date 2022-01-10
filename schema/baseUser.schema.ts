import { Model, Schema } from "mongoose";
import { BaseUser, BaseUserWithExpiry } from "../types/User";

/**
 * Base user schema
 */
interface BaseUserModel extends Model<BaseUser> {}
interface BaseUserWithExpiryModel extends Model<BaseUserWithExpiry> {}

export const BaseUserSchema = new Schema<BaseUser, BaseUserModel, {}>(
  {
    _id: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    name: {
      type: String,
      trim: true,
      required: [true, "Name is required."],
      maxlength: 100,
    },
    photoUrl: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
      },
      virtuals: true,
    },
    toObject: { virtuals: true },
  }
);

export const BaseUserWithExpirySchema = new Schema<
  BaseUserWithExpiry,
  BaseUserWithExpiryModel,
  {}
>(
  {
    _id: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    name: {
      type: String,
      trim: true,
      required: [true, "Name is required."],
      maxlength: 100,
    },
    photoUrl: {
      type: String,
      default: null,
    },
    subscription_expires: {
      type: Date,
    },
  },
  {
    _id: false,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
      },
      virtuals: true,
    },
    toObject: { virtuals: true },
  }
);
