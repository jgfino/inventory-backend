import { FilterQuery, Model, model, Schema, Types } from "mongoose";
import { Location, Item } from "../types/Location";
import QueryChain from "../types/QueryChain";
import AuthorizableModel, { AuthModes } from "../types/AuthorizableModel";
import { BaseUserSchema, BaseUserWithExpirySchema } from "./baseUser.schema";
import UserModel from "./user.schema";

//#region Types

type LocationQuery = QueryChain<Location>;
type ItemQuery = QueryChain<Item>;

/**
 * The location model w/static methods
 */
interface LocationModel extends AuthorizableModel<Location> {}

/**
 * Item model with static methods
 */
interface ItemModel extends Model<Item> {}

//#endregion

//#region Schema definition

/**
 * Item Schema definition
 */
const ItemSchema = new Schema<Item, ItemModel, {}>(
  {
    _id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: [true, "Item name is required."],
      maxlength: 100,
    },
    category: {
      type: String,
      required: true,
      default: "Other",
      maxlength: 100,
      lowercase: true,
    },
    iconName: {
      type: String,
      required: [true, "Icon name required"],
      maxlength: 100,
    },
    owner: {
      type: BaseUserSchema,
      required: true,
    },
    expirationDate: {
      type: Date,
    },
    added: {
      type: Date,
    },
    opened: {
      type: Date,
    },
    purchaseLocation: {
      type: String,
      maxlength: 100,
    },
    price: {
      type: Schema.Types.Decimal128,
      default: new Types.Decimal128("0.00"),
    },
    notes: {
      type: String,
      maxlength: 300,
    },
  },
  {
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;

        const price: Types.Decimal128 = ret.price;
        if (price) {
          ret.price = price.toString();
        }
      },
      virtuals: true,
    },
    toObject: { virtuals: true },
  }
);

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
            min: 0,
            max: 30,
            default: [],
          },
        ],
        _id: false,
      },
    ],
    items: [ItemSchema],
    lastOpened: [
      {
        user: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        date: {
          type: Date,
          required: true,
          default: new Date(),
        },
        _id: false,
      },
    ],
    lastUpdatedBy: {
      type: BaseUserSchema,
      required: true,
    },
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

        if (ret.lastOpened) {
          ret.lastOpened = ret.lastOpened[0]?.date;
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
    "owner.subscriptionExpires": { $gt: new Date() },
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
        break;
    }
  }

  return this.find(query);
};

//#endregion

const LocationModel = model<Location, LocationModel>(
  "Location",
  LocationSchema
);

export const ItemModel = model<Item, ItemModel>("Item", ItemSchema);
export default LocationModel;
