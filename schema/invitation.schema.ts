import { Document, model, Schema, Types } from "mongoose";
import BaseModel, { modelDefaults } from "../types/BaseModel";
import BaseQuery from "../types/BaseQuery";
import BaseQueryHelper from "../types/BaseQueryHelper";
import Invitation from "../types/Invitation";
import { BaseLocation } from "../types/Location";
import { BaseUser } from "../types/User";
import { LocationDocument } from "./location.schema";
import { UserDocument } from "./user.schema";
import LocationModel from "./location.schema";

interface InvitationBaseDocument extends Document, Omit<Invitation, "_id"> {
  accept(): Promise<void>;
  decline(): Promise<void>;
}

export interface InvitationDocument extends InvitationBaseDocument {
  to: UserDocument["_id"];
  from: UserDocument["_id"];
  location: LocationDocument["_id"];
}

export interface InvitationPopulatedDocument extends InvitationBaseDocument {
  to: BaseUser;
  from: BaseUser;
  location: BaseLocation;
}

export type InvitationQuery = BaseQuery<
  InvitationPopulatedDocument,
  InvitationQueryHelpers
>;
type InvitationQueryHelpers = {};

interface InvitationModel
  extends BaseModel<InvitationDocument, InvitationQueryHelpers> {
  findTo(user: String): InvitationQuery;
  findFrom(user: String): InvitationQuery;
}

const InvitationSchema = new Schema<InvitationDocument, InvitationModel>(
  {
    to: {
      type: Types.ObjectId,
      required: true,
      ref: "User",
    },
    from: {
      type: Types.ObjectId,
      required: true,
      ref: "User",
    },
    location: {
      type: Types.ObjectId,
      required: true,
      ref: "Location",
    },
    message: {
      type: String,
      required: true,
      maxlength: 100,
      default: "You've been invited to a location!",
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

InvitationSchema.methods.accept = async function () {
  const location = await LocationModel.findById(this.location);

  if (!location) {
    throw "No location found";
  }

  await location.addMember(this.to);
  await this.delete();
};

InvitationSchema.methods.decline = async function () {
  await this.delete();
};

InvitationSchema.statics.findTo = async function (user: String) {
  return this.find({ to: user });
};

InvitationSchema.statics.findFrom = async function (user: String) {
  return this.find({ from: user });
};

InvitationSchema.statics.getAuthFilter = function (user: String) {
  return {
    $or: [{ to: user }, { from: user }],
  };
};

InvitationSchema.statics.findByIdAuthorized = modelDefaults.findByIdAuthorized;
InvitationSchema.statics.findAuthorized = modelDefaults.findAuthorized;

InvitationSchema.pre("find", function () {
  this.populate("to", "_id name photoUrl")
    .populate("from", "_id name photoUrl")
    .populate("location");
});

export default model<InvitationDocument, InvitationModel>(
  "Invitation",
  InvitationSchema
);
