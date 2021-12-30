import * as invitations from "../controllers/invitation.controller";
import express from "express";

const router = express.Router();

/**
 * Create and send an invitation. Invitations expire after 7 days
 */
router.post("/", invitations.createInvitation);

/**
 * Get all invitations. Filter by to/from/location id. With no filter,
 * returns all locations a user either sent or received. Fields are
 * automatically populated. Sorted by creation time, descending
 */
router.get("/", invitations.getInvitations);

/**
 * Get an invitation. Fields are automatically populated
 */
router.get("/:id", invitations.getInvitation);

/**
 * Accept an invitation
 */
router.post("/:id/accept", invitations.acceptInvitation);

/**
 * Decline an invitation
 */
router.post("/:id/decline", invitations.declineInvitation);

export default router;
