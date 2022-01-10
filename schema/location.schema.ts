import { FilterQuery, model, Schema } from "mongoose";
import { Location } from "../types/Location";
import QueryChain from "../types/QueryChain";
import AuthorizableModel, { AuthModes } from "../types/AuthorizableModel";
import AuthErrors from "../error/errors/auth.errors";
import { BaseUserSchema, BaseUserWithExpirySchema } from "./baseUser.schema";
import ItemSchema from "./item.schema";
import UserModel from "./user.schema";

//#region Types

type LocationQuery = QueryChain<Location, {}, {}, LocationVirtuals>;

interface LocationVirtuals {
  /**
   * The number of items in this location
   */
  numItems: number;
}

/**
 * The location model w/static methods
 */
interface LocationModel
  extends AuthorizableModel<Location, {}, {}, LocationVirtuals> {}

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
    owner: BaseUserWithExpirySchema,
    members: [BaseUserSchema],
    notificationDays: [
      {
        type: {
          user: Schema.Types.ObjectId,
          days: [
            {
              type: Number,
            },
          ],
        },
        _id: false,
      },
    ],
    items: [ItemSchema],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.owner?.subscription_expires;
      },
      virtuals: true,
    },
    toObject: { virtuals: true },
  }
);

//#region Virtuals

// Determine the number of items in this location
LocationSchema.virtual("numItems").get(function (this: Location) {
  return this.items?.length ?? undefined;
});

//#endregion

//#region Middleware

// Delete related items and reset user defaults when removing a location
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

/**
 * Create a location safely. Sets the owner to the requesting user id.
 * Locations can be created if:
 * Free:
 *  - A user has no owned locations, and the given icon is either fridge or pantry
 * Premium:
 *  - Always
 * @param auth The user id to create with.
 * @param data The data to create with.
 */
LocationSchema.statics.createAuthorized = async function (
  auth: Express.User,
  data: Partial<Location>
) {
  const id = auth._id;
  const isPremium = UserModel.isPremium(auth);

  if (!isPremium) {
    if (auth.defaultLocation) {
      return Promise.reject(
        AuthErrors.PREMIUM_FEATURE(
          "A paid account is required to create more than one Location"
        )
      );
    }

    if (
      data.iconName.toLowerCase() != "fridge" &&
      data.iconName.toLowerCase() != "pantry"
    ) {
      return Promise.reject(
        AuthErrors.PREMIUM_FEATURE(
          "Only Pantry and Fridge Locations can be created with a free account"
        )
      );
    }
  }

  const newLocation = await LocationModel.create({
    ...data,
    owner: {
      _id: id,
      name: auth.name,
      photoUrl: auth.photoUrl,
      subscription_expires: auth.subscription_expires,
    },
    notificationDays: [
      {
        user: id,
        days: [],
      },
    ],
  });

  // If this is the user's first Location, specify this
  if (!auth.defaultLocation) {
    await UserModel.updateOne(
      { _id: id },
      { defaultLocation: newLocation._id }
    );
  }

  return newLocation;
};

//#endregion

const LocationModel = model<Location, LocationModel>(
  "Location",
  LocationSchema
);

export default LocationModel;
