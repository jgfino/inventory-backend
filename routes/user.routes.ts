/**
 * Defines routes to access and modify user information.
 */

import * as users from "../controllers/user.controller";
import express from "express";

const router = express.Router();

/**
 * Get a user's public profile information. Public information includes:
 * - id, name, photoUrl
 * - Mutual locations
 * - Owned items in mutual locations
 */
router.get("/:id/profile", users.getUserProfile);

export default router;
