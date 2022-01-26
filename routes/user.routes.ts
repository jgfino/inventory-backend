import * as users from "../controllers/user.controller";
import express from "express";

const router = express.Router();

/**
 * GET /api/v1/users/{id}/profile
 */
router.get("/:id/profile", users.getUserProfile);

export default router;
