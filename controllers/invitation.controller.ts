import { Request, Response } from "express";
import { catchAsync } from "../error/catchAsync";
import InvitationModel from "../schema/invitation.schema";

export const createInvitation = async (req: Request, res: Response) => {
  if (!req.body) {
    return res.sendEmptyError();
  }

  const invitation = new InvitationModel({
    to: req.body.to,
    from: req.user._id,
    location: req.body.location,
    message: req.body.message,
  });

  try {
    const newInvitation = await invitation.save();
    return res.send(newInvitation);
  } catch (err: any) {
    return res.sendInternalError(
      `An error occured creating a new Invitation: ${err.message}`
    );
  }
};

export const getInvitations = catchAsync(async (req, res, next) => {
  const received = req.params.received;
  const sent = req.params.sent;
  const id = req.user._id;

  // let invitations: InvitationPopulatedDocument[];
  // if (received) {
  //   invitations = await InvitationModel.findTo(id);
  // } else if (sent) {
  //   invitations = await InvitationModel.findFrom(id);
  // } else {
  //   //invitations = await InvitationModel.findAuthorized(id);
  // }
  // return res.send(invitations);
});

export const getInvitation = async (req: Request, res: Response) => {
  const invitationId = req.params.id;
  const userId = req.user._id;

  try {
    // const invitation = await InvitationModel.findByIdAuthorized(
    //   invitationId,
    //   userId
    // );
    // return res.send(invitation);
  } catch (err: any) {
    return res.sendInternalError(
      `An error occured retreiving Invitation with id=${invitationId}: ${err.message}`
    );
  }
};

export const acceptInvitation = async (req: Request, res: Response) => {
  const invitationId = req.params.id;
  const userId = req.user._id;

  try {
    // const invitation = await InvitationModel.findByIdAuthorized(
    //   invitationId,
    //   userId
    // );
    // await invitation.accept();
    return res.send();
  } catch (err: any) {
    return res.sendInternalError(
      `An error occured accepting Invitation with id=${invitationId}: ${err.message}`
    );
  }
};

export const declineInvitation = async (req: Request, res: Response) => {
  const invitationId = req.params.id;
  const userId = req.user._id;

  try {
    // const invitation = await InvitationModel.findByIdAuthorized(
    //   invitationId,
    //   userId
    // );
    // await invitation.decline();
    return res.send();
  } catch (err: any) {
    return res.sendInternalError(
      `An error occured rejecting Invitation with id=${invitationId}: ${err.message}`
    );
  }
};
