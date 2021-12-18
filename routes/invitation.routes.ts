import * as invitations from "../controllers/invitation.controller";
var router = require("express").Router();

/**
 * Create a new invitation
 *
 * POST /api/invitations
 */
router.post("/", invitations.createInvitation);

/**
 * Get all invitations
 *
 * GET /api/invitations
 */
router.get("/", invitations.getInvitations);

/**
 * Get all received invitations
 *
 * GET /api/invitations/received
 */
router.get("/received", invitations.getInvitations);

/**
 * Get all sent invitations
 *
 * GET /api/invitations/sent
 */
router.get("/sent", invitations.getInvitations);

/**
 * Get a specific invitation
 *
 * GET /api/invitations/:id
 */
router.get("/:id", invitations.getInvitation);

/**
 * Accept an invitation
 *
 * POST /api/invitations/:id/accept
 */
router.post("/:id/accept", invitations.acceptInvitation);

/**
 * Decline an invitation
 *
 * POST /api/invitations/:id/decline
 */
router.post("/:id/decline", invitations.declineInvitation);

export default router;
