import { model, Schema, Types } from "mongoose";
import { Location } from "../types/Location";
import InvitationModel from "./invitation.schema";
import DatabaseErrors from "../error/errors/database.errors";
import ErrorResponse from "../error/ErrorResponse";
import QueryChain from "./QueryChain";
import AuthorizableModel from "./AuthorizableModel";

//#region Types

type LocationQuery = QueryChain<Location, LocationQueryHelpers>;

interface LocationQueryHelpers {
  searchByName(text?: string): LocationQuery;
  byShared(shared?: boolean): LocationQuery;
}

/**
 * The location model w/static methods
 */
interface LocationModel
  extends AuthorizableModel<Location, LocationQueryHelpers> {}

//#endregion

//#region Schema definition

/**
 * Location schema definition
 */
const LocationSchema = new Schema<Location, LocationModel>(
  {
    name: {
      type: String,
      required: true,
    },
    iconName: {
      type: String,
      required: true,
    },
    colorName: {
      type: String,
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shared: {
      type: Boolean,
      default: false,
    },
    members: [
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
    },
  }
);

//#endregion

//#region Query helpers

LocationSchema.query.searchByName = function (text?: string) {
  if (!text) return this;
  return this.find({ $text: { $search: text } });
};

LocationSchema.query.byShared = function (shared?: boolean) {
  if (shared == null) return this;
  return this.find({ shared: shared });
};

//#endregion

//#region Static methods

/**
 * See if a user is authorized to view this location. Users are authorized if:
 * - They are the owner of a location
 * - They are a member of a location
 * - They have been invited to a location
 * @param authId The user id to check
 */
LocationSchema.statics.authorize = function (
  authId: string,
  cb: (err: ErrorResponse, query: LocationQuery) => void
) {
  // Get ids of locations this user has been invited to
  InvitationModel.find()
    .distinct("location")
    .then((invitedLocationIds) => {
      const authQuery = this.find({
        $or: [
          { owner: authId },
          { members: authId },
          { _id: { $in: invitedLocationIds } },
        ],
      });
      cb(authId ? null : DatabaseErrors.NOT_AUTHORIZED, authQuery);
    });
};

/**
 * Safely create a new user document
 * @param authId The user id to use
 * @param data The new data to use when creating the document
 */
LocationSchema.statics.createAuthorized = async function (
  authId: string,
  data: any
) {
  return await this.create({
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
