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
      required: true,
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
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
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
    subscriptionExpires: {
      type: Date,
    },
  },
  {
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;

        ret.isSubscribed = ret.subscriptionExpires > new Date();
        delete ret.subscriptionExpires;
      },
      virtuals: true,
    },
    toObject: { virtuals: true },
  }
);
