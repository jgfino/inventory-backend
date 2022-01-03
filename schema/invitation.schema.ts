import { model, Schema } from "mongoose";
import Invitation from "../types/Invitation";
import AuthorizableModel, { AuthModes } from "../types/AuthorizableModel";
import ErrorResponse from "../error/ErrorResponse";
import LocationModel from "./location.schema";
import mongoose from "mongoose";
import DatabaseErrors from "../error/errors/database.errors";
import QueryChain from "../types/QueryChain";

//#region Types

type InvitationQuery = QueryChain<Invitation>;

interface InvitationModel extends AuthorizableModel<Invitation> {}

//#endregion

//#region Schema

const InvitationSchema = new Schema<Invitation, InvitationModel, {}>(
  {
    to: {
      type: Schema.Types.ObjectId,
      required: [true, "Invitation recipient required"],
      ref: "User",
      autopopulate: { select: "_id name photoUrl" },
    },
    from: {
      type: Schema.Types.ObjectId,
      required: [true, "Invitation sender required"],
      ref: "User",
      autopopulate: { select: "_id name photoUrl" },
    },
    location: {
      type: Schema.Types.ObjectId,
      required: [true, "Invitation location required"],
      ref: "Location",
      autopopulate: { select: "_id name numItems owner" },
    },
    message: {
      type: String,
      required: true,
      maxlength: 200,
      default: "You've been invited to a location!",
    },
    expires: {
      type: Date,
      required: true,
      default: new Date(new Date().getTime() + 3600000 * 168), // in 7 days
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
      virtuals: true,
    },
    toObject: { virtuals: true },
  }
);
InvitationSchema.plugin(require("mongoose-autopopulate"));

//#endregion

//#region Middleware

/**
 * Make sure a user has not already been invited to or already a member of
 * the invitation's location.
 */
InvitationSchema.pre("validate", async function (next) {
  if (this.to.equals(this.from)) {
    return next(
      DatabaseErrors.INVALID_FIELD("To and from fields cannot be the same")
    );
  }

  const alreadyMember = await LocationModel.findOne(
    {
      _id: this.location,
      $or: [
        { owner: this.to },
        { members: this.to },
        { invitedMembers: this.to },
      ],
    },
    "_id"
  ).lean();

  if (alreadyMember) {
    return next(
      DatabaseErrors.DUPLICATE_FIELD(
        "This user is already a member of or has already been invited to this location."
      )
    );
  }

  next();
});

/**
 * Before saving, add the recipient to the location's invited members
 */
InvitationSchema.pre("save", async function (next) {
  await LocationModel.updateOne(
    { _id: this.location },
    { $addToSet: { invitedMembers: this.to } }
  );
  next();
});

/**
 * Before removing, remove the recipient from the location's invited members
 */
InvitationSchema.pre("remove", async function (next) {
  await LocationModel.updateOne(
    { _id: this.location },
    { $pull: { invitedMembers: this.to } }
  );

  next();
});

//#endregion

//#region Static methods

/**
 * See if a user is authorized to view an invitation. Users are authorized if:
 * - They sent or received the invitation (view/delete)
 * - They received the invitation (update (accept))
 * - The invitation has not expired (all)
 * @param authId The user id to check
 * @param cb Callback with the authorized query
 */
InvitationSchema.statics.authorize = function (
  authId: string,
  mode: AuthModes,
  cb: (err: ErrorResponse, query: InvitationQuery) => void
) {
  let query = this.find({ expires: { $gt: new Date() } });
  switch (mode) {
    case "delete":
    case "view":
      query = query.find({ $or: [{ to: authId }, { from: authId }] });
      break;
    case "update":
      query = query.find({ to: authId });
      break;
  }
  cb(null, query);
};

/**
 * Create an invitation safely. To do this, an invitation must be from the
 * requesting user, and the requesting user must be able to update the
 * location on the invitation.
 * @param authId The user id to use in creation.
 * @param data The data to create the invitation with.
 */
InvitationSchema.statics.createAuthorized = async function (
  authId: string,
  data: Partial<Invitation>
) {
  return new Promise((resolve, reject) => {
    LocationModel.authorize(authId, "update", async (err, query) => {
      if (err) {
        return reject(err);
      }

      try {
        const canAccessLocation = await query
          .findOne({ _id: data.location }, "_id")
          .lean();

        if (!canAccessLocation) {
          return reject(
            DatabaseErrors.NOT_FOUND(
              "The specified location does not exist or you do not have permission to access it."
            )
          );
        }

        const invitation = await InvitationModel.create({
          ...data,
          from: authId,
        });

        resolve(invitation);
      } catch (error) {
        reject(error);
      }
    });
  });
};

//#endregion

const InvitationModel = model<Invitation, InvitationModel>(
  "Invitation",
  InvitationSchema
);

export default InvitationModel;
