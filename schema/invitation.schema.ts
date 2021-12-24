import { Document, Model, model, Schema, Types } from "mongoose";
import Invitation from "../types/Invitation";
import { BaseLocation } from "../types/Location";
import { BaseUser } from "../types/User";
import LocationModel from "./location.schema";
import DatabaseErrors from "../error/errors/database.errors";
import QueryChain from "./QueryChain";

interface InvitationBaseDocument extends Document, Omit<Invitation, "_id"> {
  /**
   * Accept this invitation
   */
  accept(): Promise<void>;

  /**
   * Decline this invitation
   */
  decline(): Promise<void>;

  /**
   * Revoke this invitation
   */
  revoke(): Promise<void>;
}

interface InvitationDocument extends InvitationBaseDocument {}

export type InvitationQuery = QueryChain<
  InvitationDocument,
  InvitationQueryHelpers
>;
type InvitationQueryHelpers = {};

interface InvitationModel
  extends Model<InvitationDocument, InvitationQueryHelpers> {
  findTo(user: String): InvitationQuery;
  findFrom(user: String): InvitationQuery;
}

//#region Schema

/**
 * Invitation schema definition
 */
const InvitationSchema = new Schema<InvitationDocument, InvitationModel>(
  {
    to: {
      type: Schema.Types.ObjectId,
      required: [true, "Invitation recipient required"],
      ref: "User",
    },
    from: {
      type: Schema.Types.ObjectId,
      required: [true, "Invitation sender required"],
      ref: "User",
    },
    location: {
      type: Schema.Types.ObjectId,
      required: [true, "Invitation location required"],
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

//#endregion

//#region Middleware

InvitationSchema.pre("find", function () {
  this.populate("to", "_id name photoUrl")
    .populate("from", "_id name photoUrl")
    .populate("location");
});

//#endregion

//#region Static methods

// Find invitations sent to the given user
InvitationSchema.statics.findTo = async function (user: string) {
  //return this.find({ to: user });
};

// Find invitations sent from the given user
InvitationSchema.statics.findFrom = async function (user: String) {
  //return this.find({ from: user });
};

//#endregion

//#region Document methods

// Accept this invitation
InvitationSchema.methods.accept = async function () {
  const location = await LocationModel.findById(this.location);

  if (!location) {
    return Promise.reject(
      DatabaseErrors.NOT_FOUND("Could not find Invitation to accept.")
    );
  }

  // Add the member to the location
  //await location.addMember(this.to);

  // Delete this invitation
  await this.delete();
};

// Decline this invitation
InvitationSchema.methods.decline = async function () {
  await this.delete();
};

export default model<InvitationDocument, InvitationModel>(
  "Invitation",
  InvitationSchema
);
