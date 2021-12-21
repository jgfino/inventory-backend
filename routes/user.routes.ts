/**
 * Defines routes to access and modify user information.
 */

import * as users from "../controllers/user.controller";
import express from "express";

const router = express.Router();

// Get a user
router.get("/:id", users.getUser);

export default router;
