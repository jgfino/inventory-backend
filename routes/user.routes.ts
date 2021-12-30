/**
 * Defines routes to access and modify user information.
 */

import * as users from "../controllers/user.controller";
import express from "express";

const router = express.Router();

/**
 * Get a user's public profile information. Public information includes:
 * - name
 * - id
 * - profile photo
 * - mutual locations, with preview population
 */
router.get("/:id", users.getUser);

export default router;
