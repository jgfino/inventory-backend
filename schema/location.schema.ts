import { Document, Model, model, Query, Schema, Types } from "mongoose";
import Location from "../types/Location";
import User from "../types/User";
import { UserDocument } from "./user.schema";

// The base document for locations
interface LocationBaseDocument extends Document, Location {
  getNumItems(): number;
}

export interface LocationDocument extends LocationBaseDocument {
  owner: UserDocument["_id"];
  members: UserDocument["_id"][];
}

export interface LocationPopulatedDocument extends LocationBaseDocument {
  owner: User;
  members: User[];
}

const LocationSchema = new Schema<LocationDocument, LocationModel>(
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
      type: Types.ObjectId,
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

export type LocationQuery = Query<any, Document<LocationDocument>> &
  LocationQueryHelpers;
export type PopulatedLocationQuery = Query<
  any,
  Document<LocationPopulatedDocument>
> &
  LocationQueryHelpers;

interface LocationQueryHelpers {
  byShared(shared?: Boolean): LocationQuery;
  byAllowed(id: String): LocationQuery;
  search(params?: String): LocationQuery;
  populateAll(): PopulatedLocationQuery;
}

LocationSchema.query.populateAll = function () {
  return this.populate("owner").populate("members");
};

LocationSchema.query.search = function (params?: string) {
  if (!params) return this;
  return this.find({ $text: { $search: params } });
};

LocationSchema.query.byShared = function (shared: boolean = false) {
  return this.find({ shared: shared });
};

LocationSchema.query.byAllowed = function (id: String) {
  return this.where({ $or: [{ owner: id }, { members: id }] });
};

type LocationModel = Model<LocationDocument, LocationQueryHelpers>;
export default model<LocationDocument, LocationModel>(
  "Location",
  LocationSchema
);
