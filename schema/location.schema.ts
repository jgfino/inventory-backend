import { Document, FilterQuery, Model, model, Schema, Types } from "mongoose";
import BaseModel, { modelDefaults } from "../types/BaseModel";
import BaseQuery from "../types/BaseQuery";
import BaseQueryHelper from "../types/BaseQueryHelper";
import { Location } from "../types/Location";
import { BaseUser } from "../types/User";
import { UserDocument } from "./user.schema";

interface LocationBaseDocument extends Document, Omit<Location, "_id"> {
  addMember(id: string): Promise<void>;
  removeMember(id: string): Promise<void>;
}

export interface LocationDocument extends LocationBaseDocument {
  owner: UserDocument["_id"];
  members: UserDocument["_id"][];
  invitedMembers: UserDocument["_id"][];
}

export interface LocationPopulatedDocument extends LocationBaseDocument {
  owner: BaseUser;
  members: BaseUser[];
  invitedMembers: BaseUser[];
}

export type LocationQuery = BaseQuery<
  LocationPopulatedDocument,
  LocationQueryHelpers
>;

interface LocationQueryHelpers {
  searchByName(text?: string): LocationQuery;
  byShared(shared?: boolean): LocationQuery;
}

interface LocationModel
  extends BaseModel<LocationDocument, LocationQueryHelpers> {}

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
    invitedMembers: [
      {
        type: Types.ObjectId,
        required: true,
        ref: "User",
      },
    ],
    itemCount: {
      type: Number,
      required: true,
      default: 0,
    },
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

LocationSchema.methods.addMember = async function (id: String) {
  await this.update({ $push: { members: id } });
};

LocationSchema.methods.removeMember = async function (id: String) {
  await this.update({ $pull: { members: id } });
};

LocationSchema.query.searchByName = function (text?: string) {
  if (!text) return this;
  return this.find({ $text: { $search: text } });
};

LocationSchema.query.byShared = function (shared?: boolean) {
  if (shared == null) return this;
  return this.find({ shared: shared });
};

LocationSchema.statics.getAuthFilter = function (user: string) {
  return {
    $or: [{ owner: user }, { members: user }, { invitedMembers: user }],
  };
};

LocationSchema.statics.findByIdAuthorized = modelDefaults.findByIdAuthorized;
LocationSchema.statics.findAuthorized = modelDefaults.findAuthorized;

LocationSchema.pre("find", function (next) {
  this.populate("owner", "_id name photoUrl").populate(
    "members",
    "_id name photoUrl"
  );
  next();
});

export default model<LocationDocument, LocationModel>(
  "Location",
  LocationSchema
);
