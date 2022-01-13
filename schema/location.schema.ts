import { Document, FilterQuery, model, Schema } from "mongoose";
import { Location } from "../types/Location";
import QueryChain from "../types/QueryChain";
import AuthorizableModel, { AuthModes } from "../types/AuthorizableModel";
import AuthErrors from "../error/errors/auth.errors";
import { BaseUserSchema, BaseUserWithExpirySchema } from "./baseUser.schema";
import ItemSchema from "./item.schema";
import UserModel from "./user.schema";
import { Item } from "../types/Item";

//#region Types

type LocationQuery = QueryChain<Location>;

/**
 * The location model w/static methods
 */
interface LocationModel extends AuthorizableModel<Location> {}

//#endregion

//#region Schema definition

/**
 * Location schema definition
 */
const LocationSchema = new Schema<Location, LocationModel, {}, {}>(
  {
    name: {
      type: String,
      required: [true, "Location name is required."],
      maxlength: 100,
    },
    iconName: {
      type: String,
      required: [true, "Location icon required"],
      maxlength: 100,
    },
    owner: {
      type: BaseUserWithExpirySchema,
      required: true,
    },
    members: [BaseUserSchema],
    notificationDays: [
      {
        user: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        days: [
          {
            type: Number,
            required: true,
            default: [],
          },
        ],
        _id: false,
      },
    ],
    items: [ItemSchema],
    notes: {
      type: String,
      maxlength: 300,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;

        if (ret.notificationDays) {
          ret.notificationDays = ret.notificationDays[0]?.days;
        }

        const items: Document<any, any, Item>[] = ret.items;
        if (!items || items.length < 1) {
          return;
        }

        if (Object.keys(items[0]).length == 1) {
          ret.items = items.map((item) => item.id);
        }
      },
      virtuals: true,
    },
    toObject: { virtuals: true },
  }
);

//#region Middleware

// Reset user defaults when removing a location
LocationSchema.pre("remove", async function (next) {
  // Remove this location as a user's default personal/shared
  await UserModel.updateMany(
    { defaultLocation: this._id },
    { $unset: { defaultLocation: "" } }
  );
  await UserModel.updateMany(
    { defaultSharedLocation: this._id },
    { $unset: { defaultSharedLocation: "" } }
  );
  next();
});

//#endregion

//#region Static methods

/**
 * See if a user is authorized for a location. Users are authorized if:
 * Free:
 *  - Delete: The user owns the location
 *  - Update: The location is their default location OR the location is their default shared location AND its owner has an active subscription
 *  - View:   The user owns the location OR the location is their default shared location (regardless of owner sub status)
 * Premium:
 *  - Delete: The user owns the location
 *  - Update: The user owns the location OR the user is a member of the location AND its owner has an active subscription
 *  - View: The user owns or is a member of the location (regardless of owner sub status)
 * @param auth The user to check
 * @param mode The auth mode to use
 */
LocationSchema.statics.authorize = function (
  auth: Express.User,
  mode: AuthModes
) {
  const userId = auth._id;
  const isPremium = UserModel.isPremium(auth);

  const isDefaultLocation = { _id: auth.defaultLocation ?? null };
  const isDefaultSharedLocation = { _id: auth.defaultSharedLocation ?? null };

  const owned = { "owner._id": userId };
  const isMember = { "members._id": userId };

  const ownerIsSubscribed = {
    "owner.subscription_expires": { $gt: new Date() },
  };

  let query: FilterQuery<Location>;

  if (!isPremium) {
    switch (mode) {
      case "delete":
        query = owned;
        break;
      case "update":
        query = {
          $or: [
            isDefaultLocation,
            { $and: [isDefaultSharedLocation, ownerIsSubscribed] },
          ],
        };
        break;
      case "view":
        query = { $or: [owned, isDefaultSharedLocation] };
        break;
    }
  } else {
    switch (mode) {
      case "delete":
        query = owned;
        break;
      case "update":
        query = { $or: [owned, { $and: [isMember, ownerIsSubscribed] }] };
        break;
      case "view":
        query = { $or: [owned, isMember] };
    }
  }

  return this.find(query);
};

//#endregion

const LocationModel = model<Location, LocationModel>(
  "Location",
  LocationSchema
);

export default LocationModel;
