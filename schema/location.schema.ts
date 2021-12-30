import { model, Schema, Types } from "mongoose";
import { Location } from "../types/Location";
import InvitationModel from "./invitation.schema";
import ErrorResponse from "../error/ErrorResponse";
import QueryChain from "../types/QueryChain";
import AuthorizableModel, { AuthModes } from "../types/AuthorizableModel";

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
    invitedMembers: [
      {
        type: Types.ObjectId,
        required: true,
        ref: "User",
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
  // Delete invitations to this location
  await InvitationModel.deleteMany({ location: this._id });

  // Delete items in this location
  await InvitationModel.deleteMany({ location: this._id });

  next();
});

//#endregion

//#region Static methods

/**
 * See if a user is authorized to view a location. Users are authorized if:
 * - They are the owner of a location (view, update, delete)
 * - They are a member of a location (view and update only)
 * - They have been invited to a location (preview)
 * @param authId The user id to check
 * @param cb Callback with the authorized query
 */
LocationSchema.statics.authorize = function (
  authId: string,
  mode: AuthModes,
  cb: (err: ErrorResponse, query: LocationQuery) => void
) {
  let query: LocationQuery;
  switch (mode) {
    case "delete":
      query = this.find({ owner: authId });
      break;
    case "update":
    case "view":
      query = this.find().or([{ owner: authId }, { members: authId }]);
      break;
    case "preview":
      query = this.find({ invitedMembers: authId });
      break;
  }

  // Always populate the number of items.
  query = query.populate("numItems");
  cb(null, query);
};

/**
 * Create a location safely. A location can be created safely if the requesting
 * user is the owner
 * @param authId The user id to create with.
 * @param data The data to create with.
 */
LocationSchema.statics.createAuthorized = async function (
  authId: string,
  data: Partial<Location>
) {
  await LocationModel.create({
    ...data,
    owner: authId,
  });
};

//#endregion

const LocationModel = model<Location, LocationModel>(
  "Location",
  LocationSchema
);

export default LocationModel;
