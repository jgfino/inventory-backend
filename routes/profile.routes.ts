/**
 * Defines routes to access and modify user information for the
 * current user.
 */

import * as profile from "../controllers/profile.controller";
import express from "express";

const router = express.Router();

/**
 * Get the currently logged-in user.
 */
router.get("/", profile.getProfile);

/**
 * Delete the currently logged in user
 */
router.delete("/", profile.deleteProfile);

/**
 * Update the currently logged in user. Updatable fields include name, email,
 * phone
 */
router.put("/", profile.updateProfile);

/**
 * Send the logged in user a verification email
 */
router.post("/verify/send-email", profile.sendVerificationEmail);

/**
 * Verify the logged in user's email using a code
 */
router.post("/verify/email", profile.verifyEmail);

/**
 * Send the logged in user a verification text
 */
router.post("/verify/send-text", profile.sendTextVerificationCode);

/**
 * Verify the logged in user's phone using a code
 */
router.post("/verify/phone", profile.verifyPhone);

/**
 * Enable 2FA for the logged in user
 */
router.post("/2fa/enable", profile.enable2fa);

/**
 * Disable 2FA for the logged in user
 */
router.post("/2fa/disable", profile.disable2fa);

export default router;
