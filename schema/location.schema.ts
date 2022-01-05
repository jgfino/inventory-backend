import { HydratedDocument, model, Schema, Types } from "mongoose";
import { Location } from "../types/Location";
import ErrorResponse from "../error/ErrorResponse";
import QueryChain from "../types/QueryChain";
import AuthorizableModel, { AuthModes } from "../types/AuthorizableModel";
import ItemModel from "./item.schema";
import AuthErrors from "../error/errors/auth.errors";

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

// Delete related items when removing a location
LocationSchema.pre("remove", async function (next) {
  // Delete items in this location
  await ItemModel.deleteMany({ location: this._id });
  next();
});

//#endregion

//#region Static methods

/**
 * See if a user is authorized to view a location. Users are authorized if:
 * - They are the owner of a location (view, update, delete)
 * - They are a member of a location (view and update only)
 * @param authId The user id to check
 * @param cb Callback with the authorized query
 */
LocationSchema.statics.authorize = function (
  authId: string,
  mode: AuthModes,
  cb: (err: ErrorResponse, query: LocationQuery) => void
) {
  let query = this.find(
    {},
    {
      notificationDays: { $elemMatch: { user: authId } },
      name: 1,
      iconName: 1,
      owner: 1,
      members: 1,
    }
  );
  switch (mode) {
    case "delete":
      query = query.find({ owner: authId }).populate("numItems");
      break;
    case "update":
      query = query.find().or([{ owner: authId }, { members: authId }]);
      break;
    case "view":
      query = query
        .find()
        .or([{ owner: authId }, { members: authId }])
        .populate("numItems");
      break;
  }

  cb(null, query);
};

/**
 * Create a location safely. A location can be created safely if the requesting
 * user is the owner
 * @param authId The user id to create with.
 * @param data The data to create with.
 */
LocationSchema.statics.createAuthorized = async function (
  auth: Express.User,
  data: Partial<Location>
) {
  if (!auth.subscribed) {
    if (
      data.name.toLowerCase() != "fridge" &&
      data.name.toLowerCase() != "pantry"
    ) {
      return Promise.reject(
        AuthErrors.PREMIUM_FEATURE(
          "Only Pantry and Fridge Locations can be created with a free account"
        )
      );
    }

    const hasLocation = await this.findOne({ owner: auth._id }, "_id");

    if (hasLocation) {
      return Promise.reject(
        AuthErrors.PREMIUM_FEATURE(
          "A paid account is required to create more than one Location"
        )
      );
    }
  }

  return await LocationModel.create({
    ...data,
    owner: auth._id,
    notificationDays: [
      {
        user: auth._id,
        days: [],
      },
    ],
  });
};

//#endregion

const LocationModel = model<Location, LocationModel>(
  "Location",
  LocationSchema
);

export default LocationModel;
