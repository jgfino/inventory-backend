import { Request, Response } from "express";
import { authorizeAndCatchAsync, catchAsync } from "../error/catchAsync";
import DatabaseErrors from "../error/errors/database.errors";
import InvitationModel from "../schema/invitation.schema";
import LocationModel from "../schema/location.schema";

/**
 * Create and send an invitation
 */
export const createInvitation = catchAsync(async (req, res, next) => {
  const invitation = await InvitationModel.createAuthorized(
    req.user._id,
    req.body
  );
  //TODO: send invitation notification
  res.status(200).send(invitation);
});

/**
 * Get multiple invitations.
 */
export const getInvitations = authorizeAndCatchAsync(
  async (req, res, next, invitationModel) => {
    const query = req.query;
    const conditions: any = {};

    query.to && (conditions.to = String(query.to));
    query.from && (conditions.from = String(query.from));
    query.location && (conditions.location = String(query.location));

    const invitations = await invitationModel
      .find(conditions)
      .sort({ createdAt: -1 });
    res.status(200).send(invitations);
  },
  [InvitationModel, "view"]
);

/**
 * Get a single invitation
 */
export const getInvitation = authorizeAndCatchAsync(
  async (req, res, next, invitationModel) => {
    const invitation = await invitationModel.findOne({ _id: req.params.id });
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

/**
 * Accept an invitation
 */
export const acceptInvitation = authorizeAndCatchAsync(
  async (req, res, next, invitationModel) => {
    const invitation = await invitationModel.findOne(
      { _id: req.params.id },
      {},
      { autopopulate: false }
    );

    if (!invitation) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "An invitation with this id does not exist or you do not have permission to view it."
        )
      );
    }

    // Add the recipient to the location
    await LocationModel.updateOne(
      { _id: invitation.location },
      {
        $addToSet: {
          members: req.user._id,
          notificationDays: { user: req.user._id, days: [] },
        },
      }
    );

    await invitation.remove();

    //TODO: notify acceptance

    res.status(200).send({ message: "Invitation accepted successfully." });
  },
  [InvitationModel, "update"]
);

/**
 * Decline/delete an invitation
 */
export const declineInvitation = authorizeAndCatchAsync(
  async (req, res, next, invitationModel) => {
    const invitation = await invitationModel.findOne(
      { _id: req.params.id },
      {},
      { autopopulate: false }
    );
    if (!invitation) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "A location with this id does not exist or you do not have permission to view it."
        )
      );
    }

    await invitation.remove();
    res.status(200).send({ message: "Invitation declined successfully" });
  },
  [InvitationModel, "delete"]
);
