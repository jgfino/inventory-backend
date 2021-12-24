import * as invitations from "../controllers/invitation.controller";
var router = require("express").Router();

// Create/send a new invitation
router.post("/", invitations.createInvitation);

// Get all invitations for the current user
router.get("/", invitations.getInvitations);

// Get all invitations received by the current user
router.get("/received", invitations.getInvitations);

// Get all invitations sent by the current user
router.get("/sent", invitations.getInvitations);

// Get a specific invitation
router.get("/:id", invitations.getInvitation);

// Accept an invitation
router.post("/:id/accept", invitations.acceptInvitation);

// Decline an invitation
router.post("/:id/decline", invitations.declineInvitation);

// Revoke an invitation
// router.post("/:id/revoke", invitations.revokeInvitation);

export default router;
