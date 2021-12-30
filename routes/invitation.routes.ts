import * as invitations from "../controllers/invitation.controller";
var router = require("express").Router();

/**
 * Create and send an invitation. Invitations expire after 7 days
 */
router.post("/", invitations.createInvitation);

/**
 * Get all invitations. Filter by to/from/location id. With no filter,
 * returns all locations a user either sent or received. Owner field is
 * populated for display
 */
router.get("/", invitations.getInvitations);

/**
 * Get an invitation.
 */
router.get("/:id", invitations.getInvitation);

/**
 * Get an invitation with populated fields
 */
router.get("/:id/details", invitations.getInvitation);

/**
 * Accept an invitation
 */
router.post("/:id/accept", invitations.acceptInvitation);

/**
 * Decline an invitation
 */
router.post("/:id/decline", invitations.declineInvitation);

export default router;
