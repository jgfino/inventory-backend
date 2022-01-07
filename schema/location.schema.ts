import { model, Schema, Types } from "mongoose";
import { Location } from "../types/Location";
import ErrorResponse from "../error/ErrorResponse";
import QueryChain from "../types/QueryChain";
import AuthorizableModel, { AuthModes } from "../types/AuthorizableModel";
import ItemModel from "./item.schema";
import AuthErrors from "../error/errors/auth.errors";
import UserModel from "./user.schema";
import DatabaseErrors from "../error/errors/database.errors";

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
  extends AuthorizableModel<Location, {}, {}, LocationVirtuals> {
  addMember(auth: Express.User, id: string): Promise<void>;
  removeMember(auth: Express.User, id: string, userId: string): Promise<void>;
}

//#endregion

//#region Schema definition

/**
 * Location schema definition
 */
const LocationSchema = new Schema<Location, LocationModel, {}>(
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
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      autopopulate: { select: "_id name photoUrl" },
    },
    members: [
      {
        type: Types.ObjectId,
        required: true,
        ref: "User",
      },
    ],
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
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
      virtuals: true,
    },
    toObject: { virtuals: true },
  }
);
LocationSchema.plugin(require("mongoose-autopopulate"));

//#region Virtuals

// Determine the number of items in this location
LocationSchema.virtual("numItems", {
  ref: "Item",
  localField: "_id",
  foreignField: "location",
  count: true,
});

//#endregion

//#region Middleware

// Delete related items and reset user defaults when removing a location
LocationSchema.pre("remove", async function (next) {
  // Delete items in this location
  await ItemModel.deleteMany({ location: this._id });

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
 * See if a user is authorized to view a location. Users are authorized if:
 * Free:
 *  - They are the owner of a location, and it is their first location (view, update, delete)
 *  - They are a member of a premium member's location AND it is the first premium location that they joined (view, update)
 * Premium:
 *  - They are the owner of a location (view, update, delete)
 *  - They are a member of a premium member's location (view, update)
 * @param auth The user to check
 * @param mode: The auth mode to use
 * @param cb Callback with the authorized query
 */
LocationSchema.statics.authorize = function (
  auth: Express.User,
  mode: AuthModes,
  cb: (err: ErrorResponse, query: LocationQuery) => void
) {
  const id = auth._id;
  UserModel.verifySubscription(id)
    .then((isPremium) => {
      let query = this.find(
        {},
        {
          notificationDays: { $elemMatch: { user: id } },
          name: 1,
          iconName: 1,
          owner: 1,
          members: 1,
        }
      );

      // Restrict to free Locations
      if (!isPremium) {
        query = query.find({
          $and: [
            {
              _id: { $in: [auth.defaultLocation, auth.defaultSharedLocation] },
            },
          ],
        });
      }

      switch (mode) {
        case "delete":
          query = query.find({ owner: id });
          break;
        case "update":
          query = query.find({ $or: [{ owner: id }, { members: id }] });
          break;
        case "view":
          query = query
            .find({ $or: [{ owner: id }, { members: id }] })
            .populate("numItems");
          break;
      }
      cb(null, query);
    })
    .catch((err) => cb(err, null));
};

/**
 * Create a location safely. Sets the owner to the requesting user id.
 * Locations can be created if:
 * Free:
 *  - A user has no owned locations, and the given name is either fridge or pantry
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
  const isPremium = await UserModel.verifySubscription(id);

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
    owner: id,
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
