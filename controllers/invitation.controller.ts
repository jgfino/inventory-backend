import { Request, Response } from "express";
import { authorizeAndCatchAsync, catchAsync } from "../error/catchAsync";
import DatabaseErrors from "../error/errors/database.errors";
import InvitationModel from "../schema/invitation.schema";
import LocationModel from "../schema/location.schema";

//TODO: change to authorized in schema
export const createInvitation = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const canAccessLocation = await locationModel.findOne(
      { _id: req.body.location },
      "_id"
    );

    if (!canAccessLocation) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "The specified location does not exist or you do not have permission to access it."
        )
      );
    }

    const invitation = await InvitationModel.create({
      to: req.body.to,
      from: req.user._id,
      location: req.body.location,
      message: req.body.message,
    });

    //TODO: send invitation notification

    res.status(200).send(invitation);
  },
  [LocationModel, "update"]
);

export const getInvitations = authorizeAndCatchAsync(
  async (req, res, next, invitationModel) => {
    const query = req.query;
    const conditions: any = {};

    query.to && (conditions.to = String(query.to));
    query.from && (conditions.from = String(query.from));
    query.location && (conditions.location = String(query.location));

    const populate = query.full ? Boolean(query.full) : undefined;

    let invitationQuery = invitationModel.find(conditions);
    if (populate) {
      invitationQuery = invitationQuery.populateDetails();
    }

    const invitations = await invitationQuery;
    res.status(200).send(invitations);
  },
  [InvitationModel, "view"]
);

export const getInvitation = authorizeAndCatchAsync(
  async (req, res, next, invitationModel) => {
    const query = req.query;
    const populate = query.full ? Boolean(query.full) : undefined;

    let invitationQuery = invitationModel.findOne({ _id: req.params.id });
    if (populate) {
      invitationQuery = invitationQuery.populateDetails().findOne();
    }

    const invitation = await invitationQuery;
    if (!invitation) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "A location with this id does not exist or you do not have permission to view it."
        )
      );
    }

    res.status(200).send(invitation);
  },
  [InvitationModel, "view"]
);

export const acceptInvitation = authorizeAndCatchAsync(
  async (req, res, next, invitationModel) => {
    const invitation = await invitationModel.findOne({ _id: req.params.id });
    if (!invitation) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "An invitation with this id does not exist or you do not have permission to view it."
        )
      );
    }

    //TODO: change to auth

    await LocationModel.updateOne(
      { _id: invitation.location },
      { $addToSet: { members: req.user._id } }
    );
    await invitation.remove();

    //TODO: notify acceptance

    res.status(200).send({ message: "Invitation accepted successfully." });
  },
  [InvitationModel, "update"]
);

export const declineInvitation = authorizeAndCatchAsync(
  async (req, res, next, invitationModel) => {
    const invitation = await invitationModel.findOne({ _id: req.params.id });
    if (!invitation) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "A location with this id does not exist or you do not have permission to view it."
        )
      );
    }

    await invitation.remove();

    //TODO: notify decline

    res.status(200).send({ message: "Invitation declined successfully" });
  },
  [InvitationModel, "delete"]
);
