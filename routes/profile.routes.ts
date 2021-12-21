/**
 * Defines routes to access and modify user information for the
 * current user.
 */

import * as profile from "../controllers/profile.controller";
import express from "express";

const router = express.Router();

// Get the currently logged-in user
router.get("/", profile.getProfile);

// Delete the currently logged-in user
router.delete("/", profile.deleteProfile);

// Update the currently logged-in user
router.put("/", profile.updateProfile);

// Send a verfification email
router.post("/verify/send-email", profile.sendVerificationEmail);

// Verify the user's email
router.post("/verify/email", profile.verifyEmail);

// Send a verification text
router.post("/verify/send-text", profile.sendTextVerificationCode);

// Verify the user's phone number
router.post("/verify/phone", profile.verifyPhone);

// Enable 2fa for the user
router.post("/2fa/enable", profile.enable2fa);

// Disable 2fa for the user
router.post("/2fa/disable", profile.disable2fa);

export default router;
